(() => {
'use strict';

if (window.__akaNowPlaying) return;
window.__akaNowPlaying = true;

const POLL_URL  = 'https://akakadir.vercel.app/api/now-playing';
const AUDIO_API = 'https://api.akakadir.art/api/audio';

const UA     = navigator.userAgent;
const IOS    = /iP(hone|ad|od)/.test(UA) ||
               (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const ENGINE = IOS
    ? 'webkit-ios'
    : /Firefox\//.test(UA)
        ? 'gecko'
        : /Safari\//.test(UA) && !/Chrome|Chromium|Edg\//.test(UA)
            ? 'webkit'
            : 'blink';
const DEBUG = /[?&]debug\b/.test(location.search);

const PRIME            = true;
const PRIME_TIMEOUT    = 40_000;
const PRIME_RETRY_MS   = 30_000;
const PRIME_REFRESH_MS = 8_000;
const PRIME_MAX_FAILS  = 2;

const ALIGN_OK      = 90;
const ALIGN_TRIES   = 5;
const ALIGN_SETTLE  = 0.25;
const ALIGN_SAMPLES = 3;
const ALIGN_GAP_MS  = 80;
const ALIGN_TICK_MS = 100;

const POLL_MS_PLAYING = 7_000;
const POLL_MS_PAUSED  = 15_000;
const POLL_MS_HIDDEN  = 30_000;

const TICK_MS        = 300;
const LEAD_MS        = 100;
const FETCH_TIMEOUT  = 6_000;
const MAX_POLL_FAILS = 3;

const HARD_DRIFT    = IOS ? 800 : 400;
const SEEK_COOLDOWN = 3_000;
const SEEK_GRACE    = 3_000;
const CLOCK_SNAP    = 1_500;
const CLOCK_BLEND   = 0.3;

const LOAD_TIMEOUT    = 60_000;
const MAX_AUDIO_FAILS = 3;

const LYRIC_TIMEOUT  = 15_000;
const LYRIC_RETRY_MS = [3_000, 6_000, 10_000];

const MARQUEE_PX_PER_SEC = 25;
const FILL_MAX_MS        = 6_000;

const SPAM_CLICKS = 11;
const SPAM_GAP_MS = 1_000;
const SPAM_MS     = 3_000;
const SPAM_LABEL  = 'ne deniyon yrrm';
const STALE_LABEL = 'bağlantı koptu';
const ALIGN_LABEL = 'ince ayar..';

const ENDED_RECHECK_MS = 2_500;

const STAGE_RANK = { resolving: 1, downloading: 2, uploading: 3, ready: 4 };

const PROG_POLL_FAST = 1_000;
const PROG_POLL_SLOW = 2_000;

const domCache = new Map();
const $ = id => {
    let el = domCache.get(id);
    if (!el || !el.isConnected) {
        el = document.getElementById(id);
        el ? domCache.set(id, el) : domCache.delete(id);
    }
    return el;
};
const setText = (el, t) => { if (el && el.textContent !== t) el.textContent = t; };
const mk = (tag, props = {}) => Object.assign(document.createElement(tag), props);

const safeUrl = u => {
    try {
        const x = new URL(u, location.href);
        return x.protocol === 'https:' ? x.href : '';
    } catch { return ''; }
};

const enc         = encodeURIComponent;
const audioUrl    = id => `${AUDIO_API}?videoId=${enc(id)}`;
const progressUrl = id => `${AUDIO_API}/progress?videoId=${enc(id)}`;

const toSec = v => String(v || '0:00').split(':').reduce((a, b) => a * 60 + Number(b), 0);
const fmt   = ms => {
    const t = Math.max(0, (ms / 1000) | 0);
    return `${(t / 60) | 0}:${String(t % 60).padStart(2, '0')}`;
};
const clamp   = (v, a, b) => Math.min(b, Math.max(a, v));
const median3 = a => [...a].sort((x, y) => x - y)[1];

function fetchT(url, opts = {}, ms = FETCH_TIMEOUT) {
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), ms);
    return fetch(url, { ...opts, signal: ctrl.signal }).finally(() => clearTimeout(timer));
}

const LAT_KEY = `sync.latency.${ENGINE}`;
function loadLatency() {
    try {
        const v = Number(localStorage.getItem(LAT_KEY));
        if (Number.isFinite(v) && v >= 0 && v <= 8_000) return v;
    } catch { }
    return IOS ? 300 : 0;
}
function saveLatency() {
    try { localStorage.setItem(LAT_KEY, String(ax.latency | 0)); } catch { }
}

const audio = Object.assign(new Audio(), { preload: 'auto' });
audio.setAttribute('playsinline', '');

const s = {
    track: null, key: '', playing: false, stale: false, fails: 0, duration: 0,
    lyrics: [], currentLyric: '', lineStart: -1, lyricAbort: null,
    prog: null, progId: '', choice: null, statusOn: false, label: 'beraber',
    clicks: 0, lastClick: 0, spamUntil: 0,
    statusMax: 0, statusRank: 0, statusAt: 0, loadedId: '',
    primeFails: 0, primeRetryAt: 0
};

const ax = {
    phase: 'idle',
    lastSeekAt: 0, graceUntil: 0, buffering: false, retryAt: 0,
    latency: loadLatency(), baseCt: 0,
    seekCt: 0, m: [], tries: 0, lastSampleAt: 0,
    loadAt: 0, loadStartAt: 0, prepMs: 0, dSeek: 0, primeAt: 0, primed: false,
    fails: 0, dead: false
};

const clk = { pos: 0, at: 0, lastStamp: '' };

let progTimer;
let progRun = 0;
let primeTimer;
let primeRun = 0;

const getTruePosition = () => {
    if (!s.playing || s.stale) return clk.pos;
    const p = clk.pos + (performance.now() - clk.at);
    return Math.min(Math.max(0, p), s.duration || Infinity);
};

function syncClock(apiPos, stamp) {
    if (stamp === clk.lastStamp) return;
    clk.lastStamp = stamp;

    const expected = getTruePosition();
    const diff     = apiPos - expected;

    if (!wantAudio() || Math.abs(diff) > CLOCK_SNAP) {
        clk.pos = apiPos;
    } else {
        clk.pos = expected + diff * (diff > 0 ? 0.5 : CLOCK_BLEND);
    }
    clk.at = performance.now();
}

function seekTo(ms) {
    const t = Math.max(0, ms + ax.latency) / 1000;
    try { audio.currentTime = t; } catch { return; }
    audio.playbackRate = 1;
    const now = performance.now();
    ax.lastSeekAt = now;
    ax.graceUntil = now + SEEK_GRACE;
    ax.seekCt     = t;
    ax.m          = [];
}

function loadSrc(id) {
    if (audio.src) {
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
    }
    audio.src = audioUrl(id);
    audio.playbackRate = 1;
    const now = performance.now();
    s.loadedId   = id;
    s.statusAt   = now;
    s.statusMax  = 0;
    s.statusRank = 0;
    Object.assign(ax, {
        phase: 'load', lastSeekAt: 0, graceUntil: 0, buffering: true,
        tries: 0, m: [], loadAt: now, loadStartAt: now,
        prepMs: 0, dSeek: 0, primed: false
    });
}

function playSafe() {
    let p;
    try { p = audio.play(); } catch { return; }
    if (!p || !p.catch) return;
    p.catch(err => {
        if (err?.name === 'NotAllowedError') {
            if (s.choice === 'yes') stopListen();
        } else if (err?.name !== 'AbortError') {
            console.warn('[spotify.js] audio.play hatası:', err?.name, err?.message);
        }
    });
}

function resetAudioFailures() {
    ax.fails   = 0;
    ax.dead    = false;
    ax.retryAt = 0;
}

function stopPrimePoll() {
    primeRun++;
    clearTimeout(primeTimer);
}

function audioFail() {
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    stopPrimePoll();
    s.loadedId   = '';
    ax.phase     = 'idle';
    ax.loadAt    = 0;
    ax.buffering = false;
    ax.primed    = false;

    if (s.choice !== 'yes') {
        s.primeFails++;
        s.primeRetryAt = performance.now() + PRIME_RETRY_MS;
        return;
    }

    if (++ax.fails >= MAX_AUDIO_FAILS) {
        ax.dead = true;
        progRun++;
        clearTimeout(progTimer);
    } else {
        ax.retryAt = performance.now() + 2_000 * 2 ** ax.fails;
    }
    updateStatus();
}

audio.addEventListener('waiting',  () => { ax.buffering = true;  });
audio.addEventListener('stalled',  () => { ax.buffering = true;  });
audio.addEventListener('playing',  () => { ax.buffering = false; });
audio.addEventListener('canplay',  () => { ax.buffering = false; });

['loadstart', 'seeking', 'waiting', 'stalled'].forEach(ev =>
    audio.addEventListener(ev, () => { ax.baseCt = audio.currentTime; })
);

audio.addEventListener('loadstart', () => showStatus());

audio.addEventListener('loadedmetadata', () => {
    if (s.loadedId !== s.track?.videoId) return;
    if (s.choice === 'yes') {
        if (wantAudio()) startAligned();
    } else if (ax.phase === 'load') {
        primeSeek();
    }
});

audio.addEventListener('seeked', () => {
    const now = performance.now();
    if (ax.phase === 'prime') {
        ax.dSeek = now - ax.primeAt;
        s.primeFails = 0;
        if (s.choice === 'yes') startAligned();
        else { ax.phase = 'ready'; ax.primed = true; }
        return;
    }
    if (ax.phase !== 'align') ax.graceUntil = now + SEEK_GRACE;
});

audio.addEventListener('error', () => {
    if (!audio.getAttribute('src')) return;
    if (audio.error?.code === 1) return;
    audioFail();
});

audio.addEventListener('ended', () => {
    poll();
    setTimeout(poll, ENDED_RECHECK_MS);
});

const wantAudio = () =>
    s.playing && !s.stale && s.choice === 'yes' && !!s.track?.videoId;

function audioFlowing() {
    return !audio.paused && !audio.seeking &&
           audio.readyState >= 3 &&
           audio.currentTime - ax.baseCt >= 1;
}

function targetIsBuffered(ms) {
    const t = ms / 1000;
    const b = audio.buffered;
    for (let i = 0; i < b.length; i++) {
        if (b.start(i) <= t + 1 && b.end(i) >= t) return true;
    }
    return false;
}

/* ---------- çalmadan hazırlık ---------- */

function primeSeek() {
    ax.phase   = 'prime';
    ax.primeAt = performance.now();
    try {
        audio.currentTime = Math.max(0, getTruePosition()) / 1000;
    } catch {
        ax.phase  = 'ready';
        ax.primed = true;
    }
}

async function primePoll() {
    clearTimeout(primeTimer);
    const run = ++primeRun;
    const id  = s.loadedId;
    const on  = () => run === primeRun && s.choice !== 'yes' &&
                      (ax.phase === 'load' || ax.phase === 'prime');
    if (!id || !on()) return;

    try {
        const r = await fetchT(progressUrl(id), { cache: 'no-store', credentials: 'omit' }, 3_000);
        if (run !== primeRun) return;
        if (r.ok) {
            const p = await r.json();
            if (s.loadedId === id) {
                s.prog   = p;
                s.progId = id;
                if (p.stage === 'ready' && !ax.prepMs) ax.prepMs = performance.now() - ax.loadStartAt;
            }
        }
    } catch { }

    if (!on()) return;
    primeTimer = setTimeout(primePoll, PROG_POLL_SLOW);
}

function primeIfNeeded() {
    if (!PRIME || s.choice === 'yes' || s.primeFails >= PRIME_MAX_FAILS) return;
    if (document.hidden || !s.playing || s.stale || !s.track?.videoId || ax.dead) return;

    const now = performance.now();
    const id  = s.track.videoId;

    if (s.loadedId !== id) {
        if (now < s.primeRetryAt) return;
        loadSrc(id);
        ax.loadAt = 0;
        primePoll();
        return;
    }

    if (ax.phase === 'load' || ax.phase === 'prime') {
        if (now - ax.loadStartAt > PRIME_TIMEOUT) audioFail();
        return;
    }

    if (ax.phase === 'ready' && audio.readyState >= 1 &&
        now - ax.primeAt > PRIME_REFRESH_MS &&
        !targetIsBuffered(getTruePosition() + 8_000)) {
        primeSeek();
    }
}

/* ---------- çalma: sessiz hizalama, sonra ses ---------- */

function startAligned() {
    audio.muted  = true;
    ax.phase     = 'align';
    ax.tries     = 0;
    ax.primed    = true;
    ax.graceUntil = 0;
    seekTo(getTruePosition());
    playSafe();
}

function finishAlign(d) {
    ax.latency = clamp(ax.latency + 0.5 * d, 0, 8_000);
    saveLatency();
    audio.muted   = false;
    ax.phase      = 'play';
    ax.loadAt     = 0;
    ax.fails      = 0;
    ax.graceUntil = performance.now() + 1_500;
    removeStatus(true);
}

function alignStep(drift, target, now) {
    if (audio.readyState < 3 || ax.buffering) return;
    if (audio.currentTime - ax.seekCt < ALIGN_SETTLE) return;
    if (now - ax.lastSampleAt < ALIGN_GAP_MS) return;
    ax.lastSampleAt = now;

    ax.m.push(drift);
    if (ax.m.length < ALIGN_SAMPLES) return;

    const d = median3(ax.m);
    ax.m = [];

    if (Math.abs(d) <= ALIGN_OK || ax.tries >= ALIGN_TRIES) {
        finishAlign(d);
        return;
    }
    ax.tries++;
    ax.latency = clamp(ax.latency + 0.9 * d, 0, 8_000);
    seekTo(target);
}

function syncAudio() {
    if (!wantAudio()) {
        if (!audio.paused) audio.pause();
        if (s.loadedId && (ax.phase === 'align' || ax.phase === 'play')) ax.phase = 'ready';
        return;
    }
    if (ax.dead) return;

    const now = performance.now();
    const id  = s.track.videoId;

    if (s.loadedId !== id) {
        if (now < ax.retryAt) return;
        loadSrc(id);
        audio.muted = true;
        playSafe();
        return;
    }

    if (!ax.loadAt && (ax.phase === 'load' || ax.phase === 'prime')) ax.loadAt = now;

    if (ax.loadAt) {
        if (ax.phase === 'play' && audioFlowing()) {
            ax.loadAt = 0;
            ax.fails  = 0;
        } else if (now - ax.loadAt > LOAD_TIMEOUT) {
            audioFail();
            return;
        }
    }

    if (ax.phase === 'ready') {
        startAligned();
        return;
    }

    if (ax.phase === 'load' || ax.phase === 'prime') {
        if (audio.paused) { audio.muted = true; playSafe(); }
        return;
    }

    if (audio.readyState < 1 || audio.seeking) return;

    const target = getTruePosition();

    if (audio.ended) {
        if (target < audio.duration * 1_000 - 1_500 && now - ax.lastSeekAt > 1_500) {
            ax.phase = 'ready';
            startAligned();
        }
        return;
    }

    if (audio.paused) {
        if (now - ax.lastSeekAt > 1_500) startAligned();
        else playSafe();
        return;
    }

    if (ax.buffering && audio.readyState >= 3 && audio.currentTime > ax.baseCt + 0.3) ax.buffering = false;

    const drift = target - audio.currentTime * 1_000;

    if (ax.phase === 'align') {
        alignStep(drift, target, now);
        return;
    }

    if (ax.buffering || audio.readyState < 3 || now < ax.graceUntil) return;

    if (Math.abs(drift) > HARD_DRIFT && now - ax.lastSeekAt > SEEK_COOLDOWN) {
        seekTo(target);
    }
}

/* ---------- arayüz ---------- */

function ensureStyle() {
    if ($('mp-style')) return;
    const line = 'color-mix(in srgb, currentColor 30%, transparent)';
    document.head.append(mk('style', {
        id: 'mp-style',
        textContent: `
#mp{display:block;width:100%;max-width:100%;margin:0}
#mp-mid{width:100%;min-width:0}
#lyrics{--h:1rem;display:block;position:relative;height:var(--h)}
#lyrics .ly{position:absolute;left:0;top:-.25em;width:100%;height:calc(100% + .5em);box-sizing:border-box;text-align:center;white-space:nowrap;line-height:calc(var(--h) + .5em);overflow-x:clip;overflow-y:visible}
#lyrics .ly.dim{opacity:.75}
#lyrics .ly span{display:inline-block;max-width:100%;overflow:hidden;text-overflow:ellipsis;vertical-align:top;white-space:nowrap}
#now-playing{display:flex;flex-wrap:nowrap;justify-content:center;align-items:center;gap:0;min-width:0;font-size:.8em;line-height:1.45;opacity:.75;white-space:nowrap;font-variant-numeric:tabular-nums}
#now-playing .mp-t{flex:0 1 auto;min-width:0;overflow:hidden;display:flex}
#now-playing .mp-t.mq{justify-content:flex-start;-webkit-mask-image:linear-gradient(90deg,transparent 0,#000 12px,#000 calc(100% - 12px),transparent 100%);mask-image:linear-gradient(90deg,transparent 0,#000 12px,#000 calc(100% - 12px),transparent 100%)}
#now-playing .mp-tt{flex:none;white-space:nowrap}
#now-playing .mp-t.mq .mp-tt{animation:mp-mq var(--mq-t,8s) linear infinite alternate}
@keyframes mp-mq{0%,15%{transform:translateX(0)}85%,100%{transform:translateX(calc(-1px * var(--mq-d,0)))}}
@media (prefers-reduced-motion:reduce){#now-playing .mp-t.mq .mp-tt{animation:none}}
#now-playing .mp-n,#mp-ctl{flex:none}
#mp-ctl{display:inline-flex;align-items:center;gap:6px}
#mp-ctl[hidden]{display:none}
#mp-sw{position:relative;flex:none;box-sizing:border-box;width:26px;height:14px;padding:0;margin:0;border:1px solid ${line};border-radius:7px;background:none;color:inherit;cursor:pointer;font:inherit}
#mp-sw::after{content:"";position:absolute;inset:-13px -8px}
#mp-sw i{position:absolute;top:2px;left:2px;width:8px;height:8px;border-radius:50%;background:currentColor;opacity:.45;transition:left .15s,opacity .15s}
#mp-sw[aria-checked="true"]{border-color:currentColor}
#mp-sw[aria-checked="true"] i{left:14px;opacity:1}
`
    }));
}

function ensurePlayer() {
    if ($('mp')) return;
    const lyrics = $('lyrics');
    if (!lyrics) return;
    ensureStyle();
    const np  = $('now-playing') || mk('div', { id: 'now-playing' });
    const mp  = mk('div', { id: 'mp' });
    const mid = mk('div', { id: 'mp-mid' });
    lyrics.before(mp);
    mid.append(lyrics, np);
    mp.append(mid);
}

const shownLabel = () => {
    if (performance.now() < s.spamUntil) return SPAM_LABEL;
    if (s.stale && s.choice === 'yes')   return STALE_LABEL;
    return s.label;
};

function setLabel(t) {
    s.label = t;
    setText($('mp-label'), shownLabel());
}

function syncControls() {
    const ctl = $('mp-ctl');
    if (!ctl) return;
    ctl.hidden = !(s.playing && s.track?.videoId);
    $('mp-sw')?.setAttribute('aria-checked', String(s.choice === 'yes'));
}

function startListen() {
    s.choice = 'yes';
    ax.tries = 0;
    resetAudioFailures();
    showStatus();
    syncAudio();
    setLabel(s.label);
    syncControls();
    poll();
}

function stopListen() {
    s.choice = null;
    removeStatus();
    audio.pause();
    audio.muted = false;
    if (ax.phase === 'align' || ax.phase === 'play') ax.phase = s.loadedId ? 'ready' : 'idle';
    ax.loadAt = 0;
    ax.primeAt = performance.now();
    syncControls();
}

function toggleListen() {
    const now = performance.now();
    if (now < s.spamUntil) return;

    s.clicks = now - s.lastClick < SPAM_GAP_MS ? s.clicks + 1 : 1;
    s.lastClick = now;
    if (s.clicks >= SPAM_CLICKS) {
        s.clicks    = 0;
        s.spamUntil = now + SPAM_MS;
        setLabel(s.label);
        return;
    }

    s.choice === 'yes' ? stopListen() : startListen();
}

const marquee = {
    ro: typeof ResizeObserver === 'function' ? new ResizeObserver(() => fitMarquee()) : null
};

function fitMarquee() {
    const box   = document.querySelector('#now-playing .mp-t');
    const inner = box?.firstElementChild;
    if (!box || !inner) return;
    const d = Math.ceil(inner.offsetWidth - box.clientWidth);
    if (d > 1) {
        box.style.setProperty('--mq-d', String(d));
        box.style.setProperty('--mq-t', `${(d / MARQUEE_PX_PER_SEC + 3).toFixed(1)}s`);
        box.classList.add('mq');
    } else {
        box.classList.remove('mq');
    }
}

function renderTrack() {
    const el = $('now-playing');
    if (!el || !s.track) return;

    const { artists, name, trackLink, duration } = s.track;

    const link = mk('a', {
        className: 'no-favicon',
        href:   safeUrl(trackLink) || '#',
        target: '_blank',
        rel:    'noopener noreferrer',
        textContent: name || 'bilinmeyen şarkı'
    });

    const tt = mk('span', { className: 'mp-tt' });
    tt.append(`${artists || 'bilinmeyen sanatçı'} — `, link);
    const t = mk('span', { className: 'mp-t' });
    t.append(tt);

    const time = mk('span', { id: 'progress-time', textContent: fmt(getTruePosition()) });
    const n    = mk('span', { className: 'mp-n' });
    n.append('\u00A0|\u00A0', time, `/${duration || fmt(s.duration)}`);

    const sw = mk('button', { id: 'mp-sw', type: 'button' });
    sw.setAttribute('role', 'switch');
    sw.setAttribute('aria-label', 'beraber dinle');
    sw.append(mk('i'));
    sw.addEventListener('click', toggleListen);

    const ctl  = mk('span', { id: 'mp-ctl' });
    const lead = mk('span');
    lead.append('\u00A0~\u00A0', mk('span', { id: 'mp-label', textContent: shownLabel() }));
    ctl.append(lead, sw);

    el.replaceChildren(t, n, ctl);
    syncControls();

    if (marquee.ro) {
        marquee.ro.disconnect();
        requestAnimationFrame(() => {
            const box = document.querySelector('#now-playing .mp-t');
            if (box) marquee.ro.observe(box);
        });
    }
    fitMarquee();
    requestAnimationFrame(fitMarquee);
}

function initMediaSession() {
    if (!('mediaSession' in navigator)) return;
    const set = (action, fn) => {
        try { navigator.mediaSession.setActionHandler(action, fn); } catch { }
    };
    ['seekbackward', 'seekforward', 'seekto', 'previoustrack', 'nexttrack']
        .forEach(a => set(a, () => { }));
    set('pause', () => { if (s.choice === 'yes') stopListen(); });
    set('stop',  () => { if (s.choice === 'yes') stopListen(); });
    set('play',  () => { if (s.choice !== 'yes' && s.playing && s.track?.videoId) startListen(); });
}

function updateMediaSession() {
    if (!('mediaSession' in navigator)) return;
    try {
        const d   = s.track;
        const art = d ? safeUrl(d.albumArt) : '';
        navigator.mediaSession.metadata = d
            ? new MediaMetadata({
                title:  d.name    || '',
                artist: d.artists || '',
                album:  d.album   || '',
                artwork: art
                    ? [96, 128, 192, 256, 384, 512].map(n => ({ src: art, sizes: `${n}x${n}` }))
                    : []
            })
            : null;
    } catch { }
}

function ensureLyrics() {
    ensurePlayer();
    const el = $('lyrics');
    if (!el || $('fill')) return;
    el.innerHTML = `
        <div class="ly dim"><span id="front"></span></div>
        <div class="ly"><span id="fill"></span></div>`;
    s.currentLyric = '';
    s.lineStart    = -1;
}

const parseLyrics = text =>
    [...text.matchAll(/\[(\d+):(\d+)(?:\.(\d+))?\](.*)/g)]
        .map(([, m, sc, f, t]) => ({
            time: Number(m) * 60_000 + Number(sc) * 1_000 + (f ? Number(`0.${f}`) * 1_000 : 0),
            text: t.trim()
        }))
        .sort((a, b) => a.time - b.time);

async function fetchSynced(d, signal) {
    const artist = String(d.artists || '').split(',')[0].trim();
    const track  = d.name || '';
    const dur    = Math.round((Number(d.durationMs) || toSec(d.duration) * 1_000) / 1_000);

    const getJson = async url => {
        const r = await fetch(url, { signal, credentials: 'omit' });
        if (r.status === 404) return null;
        if (!r.ok) throw new Error(`lrclib ${r.status}`);
        return r.json();
    };

    if (d.album && dur) {
        const p = new URLSearchParams({ artist_name: artist, track_name: track, album_name: d.album, duration: dur });
        const hit = await getJson(`https://lrclib.net/api/get?${p}`);
        if (hit?.syncedLyrics) return hit.syncedLyrics;
    }

    const sp   = new URLSearchParams({ artist_name: artist, track_name: track });
    const list = await getJson(`https://lrclib.net/api/search?${sp}`);
    let best = null, bestDiff = Infinity;
    for (const it of Array.isArray(list) ? list : []) {
        if (!it?.syncedLyrics) continue;
        const diff = dur && it.duration ? Math.abs(it.duration - dur) : 0;
        if (diff < bestDiff) { best = it; bestDiff = diff; }
    }
    return best && bestDiff <= 8 ? best.syncedLyrics : null;
}

async function loadLyrics(d, attempt = 0) {
    s.lyricAbort?.abort();
    const ctrl   = (s.lyricAbort = new AbortController());
    const key    = s.key;
    let timedOut = false;
    let failed   = false;
    const timer  = setTimeout(() => { timedOut = true; ctrl.abort(); }, LYRIC_TIMEOUT);

    let lyrics = { error: true };
    try {
        const text   = await fetchSynced(d, ctrl.signal);
        const parsed = text ? parseLyrics(text) : [];
        if (parsed.length) lyrics = parsed;
    } catch (e) {
        if (e.name === 'AbortError' && !timedOut) return;
        failed = true;
    } finally {
        clearTimeout(timer);
    }

    if (key !== s.key) return;

    if (failed && attempt < LYRIC_RETRY_MS.length) {
        setTimeout(() => { if (s.key === key) loadLyrics(d, attempt + 1); }, LYRIC_RETRY_MS[attempt]);
        return;
    }

    s.lyrics = lyrics;
    renderLyrics();
}

function lineAt(lines, ms) {
    let lo = 0, hi = lines.length - 1, ans = -1;
    while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (lines[mid].time <= ms) { ans = mid; lo = mid + 1; } else hi = mid - 1;
    }
    if (ans < 0) return null;
    const start = lines[ans].time;
    const end   = lines[ans + 1]?.time ?? (s.duration > start ? s.duration : start + 4_000);
    return { text: lines[ans].text, start, end };
}

function showMsg(t) {
    const f = $('front'), l = $('fill');
    if (!f || !l) return;
    setText(f, t);
    setText(l, t);
    l.style.transition = 'none';
    l.style.clipPath   = 'none';
    s.currentLyric = t;
    s.lineStart    = -1;
}

function resetLyricAnim() {
    s.currentLyric = '';
    s.lineStart    = -1;
}

function renderLyrics() {
    const f = $('front'), l = $('fill');
    if (!f || !l || !s.track) return;

    if (s.lyrics.error) {
        if (s.currentLyric !== 'err') {
            showMsg('bu şarkı sözleri, henüz eşzamanlı değil.');
            s.currentLyric = 'err';
        }
        return;
    }
    if (!s.lyrics.length) return;

    const pos = getTruePosition();
    const ln  = lineAt(s.lyrics, pos);
    if (!ln || !ln.text) {
        if (s.currentLyric !== '...') showMsg('...');
        return;
    }

    const len  = clamp(ln.end - ln.start, 300, FILL_MAX_MS);
    const clip = p => `inset(0 ${(100 - clamp(p, 0, 1) * 100).toFixed(1)}% 0 0)`;
    const at   = p => (p - ln.start) / len;

    if (s.lineStart !== ln.start || s.currentLyric !== ln.text) {
        setText(f, ln.text);
        setText(l, ln.text);
        l.style.transition = 'none';
        l.style.clipPath   = clip(at(pos));
        void l.offsetWidth;
        s.lineStart    = ln.start;
        s.currentLyric = ln.text;
    }

    const lead = s.playing && !s.stale ? TICK_MS : 0;
    l.style.transition = `clip-path ${lead}ms linear`;
    l.style.clipPath   = clip(at(pos + lead));
}

function removeStatus(flowing = false) {
    progRun++;
    clearTimeout(progTimer);
    s.prog       = null;
    s.statusMax  = 0;
    s.statusRank = 0;
    s.statusOn   = false;
    setLabel(flowing ? ENGINE : 'beraber');
}

function bufferedAhead() {
    const b = audio.buffered;
    const t = audio.currentTime;
    for (let i = 0; i < b.length; i++) {
        if (b.start(i) <= t + 0.5 && b.end(i) >= t) return b.end(i) - t;
    }
    return 0;
}

const curStage = () => {
    const pr = s.prog && s.progId === s.track?.videoId ? s.prog : null;
    return pr?.stage || (ax.primed ? 'ready' : '');
};

function statusPercent() {
    const pr      = s.prog && s.progId === s.track?.videoId ? s.prog : null;
    const stage   = curStage();
    const elapsed = (performance.now() - s.statusAt) / 1_000;
    const frac    = Math.min(1, bufferedAhead() / 5);
    let p;

    if (stage === 'downloading' || stage === 'uploading') p = 10 + (pr?.percent ?? 0) * 0.5;
    else if (stage === 'ready')                           p = 60 + 40 * frac;
    else                                                  p = Math.min(10, elapsed * 2.5);

    if (frac > 0) p = Math.max(p, 60 + 40 * frac);
    return p;
}

function updateStatus() {
    if (!s.statusOn) return;
    if (ax.dead) { setLabel('kodöldüaq'); return; }
    if (ax.phase === 'align') { setLabel(ALIGN_LABEL); return; }
    if (ax.phase === 'play' && audioFlowing()) { removeStatus(true); return; }

    s.statusMax  = Math.max(s.statusMax, statusPercent());
    const pct    = Math.min(99, Math.floor(s.statusMax));
    s.statusRank = Math.max(s.statusRank, STAGE_RANK[curStage()] ?? 0);

    setLabel([
        `hazırlık..${pct}%`,
        `çözümleme..${pct}%`,
        'ıvır zıvır..(1/2)',
        'ıvır zıvır..(2/2)',
        'bitti.'
    ][s.statusRank]);
}

async function pollProgress() {
    clearTimeout(progTimer);
    const run = ++progRun;
    const id  = s.track?.videoId;
    if (!s.statusOn || !id || ax.dead) return;

    let delay = PROG_POLL_FAST;
    try {
        const r = await fetchT(progressUrl(id), { cache: 'no-store', credentials: 'omit' }, 3_000);
        if (run !== progRun) return;
        if (r.ok) {
            s.prog   = await r.json();
            s.progId = id;
            if (s.prog.stage === 'ready' && !ax.prepMs) ax.prepMs = performance.now() - ax.loadStartAt;
            if (ax.loadAt && /^(resolving|downloading|uploading)$/.test(s.prog.stage))
                ax.loadAt = performance.now();
            updateStatus();
            if (s.prog.stage === 'ready') delay = PROG_POLL_SLOW;
        } else {
            delay = PROG_POLL_SLOW;
        }
    } catch {
        delay = PROG_POLL_SLOW;
    }

    if (run !== progRun || !s.statusOn || ax.dead) return;
    progTimer = setTimeout(pollProgress, delay);
}

function showStatus() {
    if (s.choice !== 'yes' || !s.playing) return;
    if (!s.statusOn) {
        s.statusOn   = true;
        s.statusMax  = 0;
        s.statusRank = 0;
        if (!s.loadedId) s.statusAt = performance.now();
    }
    updateStatus();
    pollProgress();
}

function renderDebug() {
    if (!DEBUG) return;
    let el = $('sync-debug');
    if (!el) {
        el = mk('div', { id: 'sync-debug' });
        el.style.cssText = 'position:fixed;right:6px;bottom:6px;z-index:99999;font:11px/1.3 monospace;pointer-events:none;background:rgba(0,0,0,.6);color:#fff;padding:3px 6px;border-radius:4px';
        document.body.append(el);
    }
    const d = getTruePosition() - audio.currentTime * 1_000;
    el.textContent =
        `${ENGINE} ${ax.phase} d=${d | 0}ms L=${ax.latency | 0} ` +
        `seek=${ax.dSeek | 0}ms prep=${ax.prepMs ? (ax.prepMs / 1000).toFixed(1) + 's' : '-'} ` +
        `rs=${audio.readyState} ${audio.paused ? 'P' : '>'}${audio.muted ? ' M' : ''}` +
        `${ax.buffering ? ' buf' : ''}${s.stale ? ' stale' : ''} ` +
        `try=${ax.tries} f=${ax.fails}${ax.dead ? '!' : ''}`;
}

function clearTrack() {
    s.lyricAbort?.abort();
    Object.assign(s, {
        track: null, key: '', playing: false, stale: false,
        lyrics: [], loadedId: ''
    });
    removeStatus();
    stopPrimePoll();
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    ax.phase  = 'idle';
    ax.primed = false;
    resetLyricAnim();
    showMsg('');
    setText($('now-playing'), '');
    marquee.ro?.disconnect();
    updateMediaSession();
}

function handleData(d, rtt = 0) {
    ensureLyrics();

    if (!d || d.error || d.type !== 'track') {
        clearTrack();
        return;
    }

    const wasLive = s.playing && !s.stale;
    if (s.stale) {
        s.stale = false;
        setLabel(s.label);
    }

    const key     = [d.trackLink, d.name, d.artists].join('|');
    const changed = key !== s.key;
    const prevVid = s.track?.videoId || '';

    s.track    = d;
    s.playing  = !!d.isPlaying;
    s.duration = Number(d.durationMs) || toSec(d.duration) * 1_000;

    const raw    = Number(d.progressMs ?? toSec(d.progress) * 1_000) || 0;
    const apiPos = Math.max(0, raw + LEAD_MS + (s.playing ? rtt / 2 : 0));
    const stamp  = String(raw);

    if (changed || !s.playing || !wasLive) {
        clk.pos       = apiPos;
        clk.at        = performance.now();
        clk.lastStamp = stamp;
    } else {
        syncClock(apiPos, stamp);
    }

    if (changed) {
        Object.assign(s, { key, lyrics: [], loadedId: '' });
        audio.pause();
        stopPrimePoll();
        removeStatus();
        resetAudioFailures();
        ax.phase     = 'idle';
        ax.primed    = false;
        ax.buffering = false;
        ax.loadAt    = 0;
        resetLyricAnim();
        showMsg('yükleniyor...');
        renderTrack();
        updateMediaSession();
        loadLyrics(d);
    } else {
        if (!$('progress-time')) renderTrack();
        if ((d.videoId || '') !== prevVid) resetAudioFailures();
    }

    if (!s.playing) {
        removeStatus();
        syncAudio();
        syncControls();
        return;
    }

    renderLyrics();
    syncAudio();
    primeIfNeeded();
    syncControls();
}

let busy  = false;
let timer;

function onPollFail() {
    if (++s.fails < MAX_POLL_FAILS || s.stale || !s.track) return;
    clk.pos = getTruePosition();
    clk.at  = performance.now();
    s.stale = true;
    setLabel(s.label);
}

function nextPollMs() {
    if (document.hidden && s.choice !== 'yes') return POLL_MS_HIDDEN;
    return s.playing && !s.stale ? POLL_MS_PLAYING : POLL_MS_PAUSED;
}

async function poll() {
    if (busy) return;
    busy = true;

    const ctrl       = new AbortController();
    const abortTimer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT);
    let data = null, rtt = 0, ok = false;

    try {
        const t0 = performance.now();
        const r  = await fetch(
            `${POLL_URL}?t=${Date.now()}`,
            { cache: 'no-store', credentials: 'omit', signal: ctrl.signal }
        );
        if (!r.ok) throw new Error(`API ${r.status}`);
        data = await r.json();
        rtt  = performance.now() - t0;
        ok   = true;
    } catch { }
    clearTimeout(abortTimer);

    if (ok) {
        s.fails = 0;
        try { handleData(data, rtt); } catch (e) { console.error('[spotify.js] handleData hatası:', e); }
    } else {
        onPollFail();
    }

    busy = false;
    clearTimeout(timer);
    timer = setTimeout(poll, nextPollMs());
}

initMediaSession();
ensureLyrics();
poll();

setInterval(() => {
    if (s.spamUntil && performance.now() >= s.spamUntil) {
        s.spamUntil = 0;
        setLabel(s.label);
    }
    if (!document.hidden) {
        setText($('progress-time'), fmt(getTruePosition()));
        renderLyrics();
        updateStatus();
    }
    syncAudio();
    primeIfNeeded();
    renderDebug();
}, TICK_MS);

setInterval(() => {
    if (ax.phase === 'align') syncAudio();
}, ALIGN_TICK_MS);

const resume = () => {
    if (document.hidden) return;
    ax.graceUntil = 0;
    ax.lastSeekAt = 0;
    if (ax.dead) resetAudioFailures();
    poll();
    primeIfNeeded();
};
document.addEventListener('visibilitychange', resume);
window.addEventListener('pageshow', resume);
window.addEventListener('online', () => poll());

if (window.__npExpose) window.__npExpose({ s, ax, clk, audio, toggleListen, startListen, stopListen });
})();
