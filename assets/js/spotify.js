'use strict';

const POLL_URL = 'https://akakadir.vercel.app/api/now-playing';
const AUDIO_API = 'https://api.akakadir.art/api/audio';

const UA = navigator.userAgent;
const IOS = /iP(hone|ad|od)/.test(UA) ||
            (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const ENGINE = IOS
    ? 'webkit-ios'
    : /Firefox\//.test(UA)
        ? 'gecko'
        : /Safari\//.test(UA) && !/Chrome|Chromium|Edg\//.test(UA)
            ? 'webkit'
            : 'blink';

const POLL_MS = 7000;
const TICK_MS = 300;
const LEAD_MS = 100;
const FETCH_TIMEOUT = 6000;
const MAX_POLL_FAILS = 3;

const HARD_DRIFT = IOS ? 1500 : 400;
const SEEK_COOLDOWN = 6000;
const SEEK_GRACE = 3000;
const CLOCK_SNAP = 1500;
const CLOCK_BLEND = 0.3;

const LOAD_TIMEOUT = 60000;
const MAX_AUDIO_FAILS = 3;

const MARQUEE_PX_PER_SEC = 25;

const STAGE_RANK = { resolving: 1, downloading: 2, uploading: 3, ready: 4 };

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

const enc = encodeURIComponent;
const audioUrl = id => `${AUDIO_API}?videoId=${enc(id)}`;
const progressUrl = id => `${AUDIO_API}/progress?videoId=${enc(id)}`;

const toSec = v => String(v || '0:00').split(':').reduce((a, b) => a * 60 + Number(b), 0);
const fmt = ms => {
    const t = Math.max(0, (ms / 1000) | 0);
    return `${(t / 60) | 0}:${String(t % 60).padStart(2, '0')}`;
};
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const median3 = a => [...a].sort((x, y) => x - y)[1];

function fetchT(url, opts = {}, ms = FETCH_TIMEOUT) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), ms);
    return fetch(url, { ...opts, signal: ctrl.signal }).finally(() => clearTimeout(timer));
}

const LAT_KEY = `sync.latency.${ENGINE}`;
function loadLatency() {
    try {
        const v = Number(localStorage.getItem(LAT_KEY));
        if (v >= 100 && v <= 8000) return v;
    } catch (e) { }
    return 1500;
}
function saveLatency() {
    try { localStorage.setItem(LAT_KEY, String(ax.latency | 0)); } catch (e) { }
}

const audio = Object.assign(new Audio(), { preload: 'auto' });
audio.setAttribute('playsinline', '');

const s = {
    track: null,
    key: '',
    playing: false,
    stale: false,
    fails: 0,
    duration: 0,
    lyrics: [],
    currentLyric: '',
    pendingLyric: null,
    lyricAbort: null,
    prog: null,
    progId: '',
    choice: null,
    statusOn: false,
    label: 'beraber',
    statusMax: 0,
    statusRank: 0,
    statusAt: 0,
    loadedId: ''
};

const ax = {
    lastSeekAt: 0, graceUntil: 0, buffering: false, retryAt: 0, latency: loadLatency(), baseCt: 0,
    learn: false, learnAt: 0, seekCt: 0, m: [], tries: 0,
    loadAt: 0, fails: 0, dead: false
};

const clk = { pos: 0, at: 0, lastStamp: '' };

let animTimer;
let progTimer;
let progRun = 0;

const getTruePosition = () => {
    if (!s.playing || s.stale) return clk.pos;
    const p = clk.pos + (performance.now() - clk.at);
    return Math.min(Math.max(0, p), s.duration || Infinity);
};

function syncClock(apiPos, stamp) {
    if (stamp === clk.lastStamp) return;
    clk.lastStamp = stamp;

    if (!IOS) {
        clk.pos = apiPos;
        clk.at = performance.now();
        return;
    }

    const expected = getTruePosition();
    const diff = apiPos - expected;
    clk.pos = Math.abs(diff) > CLOCK_SNAP ? apiPos : expected + diff * CLOCK_BLEND;
    clk.at = performance.now();
}

function seekTo(ms) {
    const t = Math.max(0, ms + (IOS ? ax.latency : 0)) / 1000;
    try {
        audio.currentTime = t;
    } catch (e) { return; }
    audio.playbackRate = 1;
    const now = performance.now();
    ax.lastSeekAt = now;
    ax.graceUntil = now + SEEK_GRACE;
    ax.seekCt = t;
    ax.learn = IOS;
    ax.learnAt = now;
    ax.m = [];
}

function loadSrc(id) {
    audio.src = audioUrl(id);
    audio.playbackRate = 1;
    s.loadedId = id;
    s.statusAt = performance.now();
    s.statusMax = 0;
    s.statusRank = 0;
    Object.assign(ax, {
        lastSeekAt: 0, graceUntil: 0, buffering: true, learn: false, tries: 0, m: [],
        loadAt: performance.now()
    });
}

function startAudio() {
    const id = s.track?.videoId;
    if (!id) return;
    if (s.loadedId !== id) loadSrc(id);
    audio.play().catch(() => { });
}

function resetAudioFailures() {
    ax.fails = 0;
    ax.dead = false;
    ax.retryAt = 0;
}

function audioFail() {
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    s.loadedId = '';
    ax.loadAt = 0;
    ax.buffering = false;
    ax.learn = false;
    if (++ax.fails >= MAX_AUDIO_FAILS) {
        ax.dead = true;
        progRun++;
        clearTimeout(progTimer);
    } else {
        ax.retryAt = performance.now() + 2000 * 2 ** ax.fails;
    }
    updateStatus();
}

audio.addEventListener('waiting', () => { ax.buffering = true; });
audio.addEventListener('stalled', () => { ax.buffering = true; });
audio.addEventListener('playing', () => { ax.buffering = false; });
audio.addEventListener('canplay', () => { ax.buffering = false; });
audio.addEventListener('seeked', () => { ax.graceUntil = performance.now() + SEEK_GRACE; });
['loadstart', 'seeking', 'waiting', 'stalled'].forEach(ev =>
    audio.addEventListener(ev, () => { ax.baseCt = audio.currentTime; })
);
audio.addEventListener('loadstart', () => showStatus());
audio.addEventListener('loadedmetadata', () => {
    if (!wantAudio() || s.loadedId !== s.track.videoId) return;
    seekTo(getTruePosition());
});
audio.addEventListener('error', () => {
    if (!audio.getAttribute('src')) return;
    audioFail();
});

const wantAudio = () => s.playing && !s.stale && s.choice === 'yes' && !!s.track?.videoId;

function audioFlowing() {
    return !audio.paused && !audio.seeking && audio.readyState >= 3 && audio.currentTime - ax.baseCt >= 1;
}

function syncAudio() {
    if (!wantAudio()) {
        if (!audio.paused) audio.pause();
        return;
    }
    if (ax.dead) return;

    const now = performance.now();
    const id = s.track.videoId;

    if (s.loadedId !== id) {
        if (now < ax.retryAt) return;
        loadSrc(id);
        audio.play().catch(() => { });
        return;
    }

    if (ax.loadAt) {
        if (audioFlowing()) { ax.loadAt = 0; ax.fails = 0; }
        else if (now - ax.loadAt > LOAD_TIMEOUT) { audioFail(); return; }
    }

    if (audio.ended || audio.readyState < 1 || audio.seeking) return;

    const target = getTruePosition();
    const drift = target - audio.currentTime * 1000;

    if (audio.paused) {
        if (Math.abs(drift) > 400 && now - ax.lastSeekAt > 1500) seekTo(target);
        audio.play().catch(() => { });
        return;
    }

    if (ax.buffering && audio.readyState >= 3 && audio.currentTime > ax.baseCt + 0.3) ax.buffering = false;
    if (ax.buffering || audio.readyState < 3 || now < ax.graceUntil) return;

    if (ax.learn) {
        if (now - ax.learnAt > 12000) { ax.learn = false; return; }
        if (audio.currentTime - ax.seekCt < 0.6) return;
        ax.m.push(drift);
        if (ax.m.length < 3) return;
        const d = median3(ax.m);
        ax.learn = false;
        ax.m = [];
        if (Math.abs(d) < 4000) {
            ax.latency = clamp(ax.latency + 0.7 * d, 100, 8000);
            saveLatency();
            if (Math.abs(d) > 400 && ax.tries < 2) {
                ax.tries++;
                seekTo(target);
            }
        }
        return;
    }

    if (Math.abs(drift) > HARD_DRIFT && now - ax.lastSeekAt > SEEK_COOLDOWN) {
        seekTo(target);
    }
}

function ensureStyle() {
    if ($('mp-style')) return;
    const line = 'color-mix(in srgb, currentColor 30%, transparent)';
    document.head.append(mk('style', {
        id: 'mp-style',
        textContent: `
#mp{display:flex;align-items:center;justify-content:flex-end;gap:8px;margin-left:auto;max-width:100%}
#mp-mid{min-width:0;flex:1;overflow:hidden}
#mp #lyrics{justify-content:flex-end}
#mp .side-front,#mp .side-bottom{justify-content:flex-end;text-align:right}
#now-playing{display:flex;flex-wrap:nowrap;justify-content:flex-end;align-items:center;gap:6px;min-width:0;font-size:.8em;line-height:1.45;opacity:.75;white-space:nowrap;font-variant-numeric:tabular-nums}
#now-playing .mp-t{flex:1 1 0;min-width:0;overflow:hidden;display:flex;justify-content:flex-end}
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
    const np = $('now-playing') || mk('div', { id: 'now-playing' });
    const mp = mk('div', { id: 'mp' });
    const mid = mk('div', { id: 'mp-mid' });
    lyrics.before(mp);
    mid.append(lyrics, np);
    mp.append(mid);
}

function setLabel(t) {
    s.label = t;
    setText($('mp-label'), t);
}

function syncControls() {
    const ctl = $('mp-ctl');
    if (!ctl) return;
    ctl.hidden = !(s.playing && s.track?.videoId);
    $('mp-sw')?.setAttribute('aria-checked', String(s.choice === 'yes'));
}

function toggleListen() {
    if (s.choice === 'yes') {
        s.choice = null;
        removeStatus();
        audio.pause();
        syncControls();
        return;
    }
    s.choice = 'yes';
    resetAudioFailures();
    showStatus();
    startAudio();
    syncControls();
}

const marquee = {
    ro: typeof ResizeObserver === 'function' ? new ResizeObserver(() => fitMarquee()) : null
};

function fitMarquee() {
    const box = document.querySelector('#now-playing .mp-t');
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
        href: trackLink || '#',
        target: '_blank',
        rel: 'noopener noreferrer',
        textContent: name || 'bilinmeyen şarkı'
    });

    const tt = mk('span', { className: 'mp-tt' });
    tt.append(`${artists || 'bilinmeyen sanatçı'} - `, link);
    const t = mk('span', { className: 'mp-t' });
    t.append(tt);

    const time = mk('span', { id: 'progress-time', textContent: fmt(getTruePosition()) });
    const n = mk('span', { className: 'mp-n' });
    n.append(mk('span', { className: 'mp-s', textContent: '| ' }), time, `/${duration || fmt(s.duration)}`);

    const sw = mk('button', { id: 'mp-sw', type: 'button' });
    sw.setAttribute('role', 'switch');
    sw.setAttribute('aria-label', 'beraber dinle');
    sw.append(mk('i'));
    sw.addEventListener('click', toggleListen);

    const ctl = mk('span', { id: 'mp-ctl' });
    ctl.append('| ', mk('span', { id: 'mp-label', textContent: s.label }), sw);

    el.replaceChildren(t, n, ctl);
    syncControls();

    if (marquee.ro) {
        marquee.ro.disconnect();
        marquee.ro.observe(t);
    }
    fitMarquee();
    requestAnimationFrame(fitMarquee);
}

function updateMediaSession() {
    if (!('mediaSession' in navigator)) return;
    try {
        const d = s.track;
        navigator.mediaSession.metadata = d
            ? new MediaMetadata({
                title: d.name || '',
                artist: d.artists || '',
                album: d.album || '',
                artwork: d.albumArt
                    ? [96, 128, 192, 256, 384, 512].map(n => ({ src: d.albumArt, sizes: `${n}x${n}` }))
                    : []
            })
            : null;
        ['seekbackward', 'seekforward', 'seekto', 'previoustrack', 'nexttrack']
            .forEach(a => { try { navigator.mediaSession.setActionHandler(a, () => { }); } catch (e) { } });
    } catch (e) { }
}

function ensureLyrics() {
    ensurePlayer();
    const el = $('lyrics');
    if (!el || $('cube')) return;
    el.innerHTML = `
        <div class="cube" id="cube">
            <div class="side-front" id="front"></div>
            <div class="side-bottom" id="bottom"></div>
        </div>`;
}

const parseLyrics = text =>
    [...text.matchAll(/\[(\d+):(\d+)(?:\.(\d+))?\](.*)/g)]
        .map(([, m, sc, f, t]) => ({
            time: Number(m) * 60000 + Number(sc) * 1000 + (f ? Number(`0.${f}`) * 1000 : 0),
            text: t.trim()
        }))
        .sort((a, b) => a.time - b.time);

async function fetchSynced(d, signal) {
    const artist = String(d.artists || '').split(',')[0].trim();
    const track = d.name || '';
    const dur = Math.round((Number(d.durationMs) || toSec(d.duration) * 1000) / 1000);
    const getJson = async url => {
        const r = await fetch(url, { signal });
        return r.ok ? r.json() : null;
    };

    if (d.album && dur) {
        const p = new URLSearchParams({ artist_name: artist, track_name: track, album_name: d.album, duration: dur });
        const hit = await getJson(`https://lrclib.net/api/get?${p}`);
        if (hit?.syncedLyrics) return hit.syncedLyrics;
    }

    const sp = new URLSearchParams({ artist_name: artist, track_name: track });
    const list = await getJson(`https://lrclib.net/api/search?${sp}`);
    let best = null;
    let bestDiff = Infinity;
    for (const it of Array.isArray(list) ? list : []) {
        if (!it?.syncedLyrics) continue;
        const diff = dur && it.duration ? Math.abs(it.duration - dur) : 0;
        if (diff < bestDiff) { best = it; bestDiff = diff; }
    }
    return best && bestDiff <= 8 ? best.syncedLyrics : null;
}

async function loadLyrics(d) {
    s.lyricAbort?.abort();
    const ctrl = (s.lyricAbort = new AbortController());
    const key = s.key;
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; ctrl.abort(); }, 10000);

    let lyrics = { error: true };
    try {
        const text = await fetchSynced(d, ctrl.signal);
        const parsed = text ? parseLyrics(text) : [];
        if (parsed.length) lyrics = parsed;
    } catch (e) {
        if (e.name === 'AbortError' && !timedOut) return;
    } finally {
        clearTimeout(timer);
    }

    if (key !== s.key) return;
    s.lyrics = lyrics;
    renderLyrics();
}

function lyricAt(lines, ms) {
    let lo = 0, hi = lines.length - 1, ans = -1;
    while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (lines[mid].time <= ms) { ans = mid; lo = mid + 1; } else hi = mid - 1;
    }
    return ans < 0 ? null : lines[ans].text || null;
}

function resetLyricAnim() {
    clearTimeout(animTimer);
    s.currentLyric = '';
    s.pendingLyric = null;
    $('cube')?.classList.remove('animate', 'show-next');
    setText($('bottom'), '');
}

function triggerCubeAnimation(newText) {
    if (s.currentLyric === newText || s.pendingLyric === newText) return;
    const cube = $('cube'), front = $('front'), bottom = $('bottom');
    if (!cube || !front || !bottom) return;

    s.pendingLyric = newText;
    bottom.textContent = newText;
    cube.classList.add('animate', 'show-next');

    animTimer = setTimeout(() => {
        cube.classList.remove('animate', 'show-next');
        front.textContent = newText;
        s.currentLyric = newText;
        s.pendingLyric = null;
    }, 600);
}

function renderLyrics() {
    const front = $('front');
    if (!front || !s.track) return;

    if (s.lyrics.error) {
        setText(front, 'bu şarkı sözleri, henüz eşzamanlı değil.');
        return;
    }
    if (!s.lyrics.length) return;

    triggerCubeAnimation(lyricAt(s.lyrics, getTruePosition()) || '...');
}

function removeStatus() {
    progRun++;
    clearTimeout(progTimer);
    s.prog = null;
    s.statusMax = 0;
    s.statusRank = 0;
    s.statusOn = false;
    setLabel('beraber');
}

function bufferedAhead() {
    const b = audio.buffered;
    const t = audio.currentTime;
    for (let i = 0; i < b.length; i++) {
        if (b.start(i) <= t + 0.5 && b.end(i) >= t) return b.end(i) - t;
    }
    return 0;
}

function statusPercent() {
    const pr = s.prog && s.progId === s.track?.videoId ? s.prog : null;
    const elapsed = (performance.now() - s.statusAt) / 1000;
    const frac = Math.min(1, bufferedAhead() / 5);
    let p;

    if (pr?.stage === 'downloading' || pr?.stage === 'uploading') p = 10 + (pr.percent ?? 0) * 0.5;
    else if (pr?.stage === 'ready') p = 60 + 40 * frac;
    else p = Math.min(10, elapsed * 2.5);

    if (frac > 0) p = Math.max(p, 60 + 40 * frac);
    return p;
}

function updateStatus() {
    if (!s.statusOn) return;

    if (ax.dead) {
        setLabel('sunucum regl olmus, baska zaman');
        return;
    }
    if (audioFlowing()) {
        removeStatus();
        return;
    }

    s.statusMax = Math.max(s.statusMax, statusPercent());
    const pct = Math.min(99, Math.floor(s.statusMax));
    const pr = s.prog && s.progId === s.track?.videoId ? s.prog : null;
    s.statusRank = Math.max(s.statusRank, STAGE_RANK[pr?.stage] ?? 0);

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
    const id = s.track?.videoId;
    if (!s.statusOn || !id || ax.dead) return;

    let delay = 700;
    try {
        const r = await fetchT(progressUrl(id), { cache: 'no-store', credentials: 'omit' }, 3000);
        if (run !== progRun) return;
        if (r.ok) {
            s.prog = await r.json();
            s.progId = id;
            if (ax.loadAt && /^(resolving|downloading|uploading)$/.test(s.prog.stage)) ax.loadAt = performance.now();
            updateStatus();
        } else delay = 2000;
    } catch (e) {
        delay = 2000;
    }

    if (run !== progRun || !s.statusOn || ax.dead) return;
    progTimer = setTimeout(pollProgress, delay);
}

function showStatus() {
    if (s.choice !== 'yes' || !s.playing) return;
    if (!s.statusOn) {
        s.statusOn = true;
        s.statusAt = performance.now();
        s.statusMax = 0;
        s.statusRank = 0;
    }
    updateStatus();
    pollProgress();
}

function clearTrack(d) {
    s.lyricAbort?.abort();
    Object.assign(s, {
        track: null, key: '', playing: false, stale: false, lyrics: [], loadedId: ''
    });
    removeStatus();
    audio.pause();
    resetLyricAnim();
    setText($('front'), '');
    setText($('now-playing'), String(d?.error || ''));
    marquee.ro?.disconnect();
    updateMediaSession();
}

function handleData(d, rtt = 0) {
    ensureLyrics();

    if (!d || d.error || d.type !== 'track') {
        clearTrack(d);
        return;
    }

    const wasLive = s.playing && !s.stale;
    s.stale = false;

    const key = [d.trackLink, d.videoId, d.name, d.artists].join('|');
    const changed = key !== s.key;

    s.track = d;
    s.playing = !!d.isPlaying;
    s.duration = Number(d.durationMs) || toSec(d.duration) * 1000;

    const raw = Number(d.progressMs ?? toSec(d.progress) * 1000) || 0;
    const apiPos = Math.max(0, raw + LEAD_MS + (IOS && s.playing ? rtt / 2 : 0));
    const stamp = String(raw);

    if (changed || !s.playing || !wasLive) {
        clk.pos = apiPos;
        clk.at = performance.now();
        clk.lastStamp = stamp;
    } else {
        syncClock(apiPos, stamp);
    }

    if (changed) {
        Object.assign(s, { key, lyrics: [], loadedId: '' });
        audio.pause();
        removeStatus();
        resetAudioFailures();
        ax.buffering = false;
        ax.learn = false;
        ax.loadAt = 0;
        resetLyricAnim();
        setText($('front'), 'yükleniyor...');
        renderTrack();
        updateMediaSession();
        loadLyrics(d);
    } else if (!$('progress-time')) {
        renderTrack();
    }

    if (!s.playing) {
        removeStatus();
        syncAudio();
        syncControls();
        return;
    }

    renderLyrics();
    syncAudio();
    syncControls();
}

let busy = false;
let timer;

function onPollFail() {
    if (++s.fails < MAX_POLL_FAILS || s.stale || !s.track) return;
    clk.pos = getTruePosition();
    clk.at = performance.now();
    s.stale = true;
}

async function poll() {
    if (busy) return;
    busy = true;

    const ctrl = new AbortController();
    const abortTimer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT);
    let data = null;
    let rtt = 0;
    let ok = false;

    try {
        const t0 = performance.now();
        const r = await fetch(`${POLL_URL}?t=${Date.now()}`, { cache: 'no-store', credentials: 'omit', signal: ctrl.signal });
        if (!r.ok) throw new Error(`API ${r.status}`);
        data = await r.json();
        rtt = performance.now() - t0;
        ok = true;
    } catch (e) { }
    clearTimeout(abortTimer);

    if (ok) {
        s.fails = 0;
        try { handleData(data, rtt); } catch (e) { console.error(e); }
    } else {
        onPollFail();
    }

    busy = false;
    clearTimeout(timer);
    timer = setTimeout(poll, POLL_MS);
}

ensureLyrics();
poll();

setInterval(() => {
    if (!document.hidden) {
        setText($('progress-time'), fmt(getTruePosition()));
        renderLyrics();
        updateStatus();
    }
    syncAudio();
}, TICK_MS);

const resume = () => {
    if (document.hidden) return;
    ax.graceUntil = 0;
    ax.lastSeekAt = 0;
    if (ax.dead) resetAudioFailures();
    poll();
};
document.addEventListener('visibilitychange', resume);
window.addEventListener('pageshow', resume);
