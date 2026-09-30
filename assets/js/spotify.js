const POLL_URL = 'https://akakadir.vercel.app/api/now-playing';
const AUDIO_API = 'https://api.akakadir.art/api/audio';
const POLL_MS = 7000;
const TICK_MS = 250;
const LEAD_MS = 100;

const IOS = /iP(hone|ad|od)/.test(navigator.userAgent) ||
            (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const CLOCK_N = 5;
const CLOCK_Q = 0.7;
const CLOCK_SNAP = 700;
const CLOCK_CONFIRM = 400;
const RTT_MAX = 3000;

const DEAD_ON = 50;
const DEAD_OFF = 20;
const HARD_MS = 1200;
const FRESH_MS = 500;
const RATE_GAIN = 1 / 2500;
const RATE_MAX = 0.08;
const SEEK_COOLDOWN = 4000;
const SETTLE_MIN = 0.6;
const SETTLE_TIMEOUT = 10000;
const L_MAX = 6000;

const $ = id => document.getElementById(id);
const toSec = v => String(v || '0:00').split(':').reduce((a, b) => a * 60 + Number(b), 0);
const fmt = ms => {
    const t = Math.max(0, (ms / 1000) | 0);
    return `${(t / 60) | 0}:${String(t % 60).padStart(2, '0')}`;
};
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const median = arr => {
    const a = [...arr].sort((x, y) => x - y), m = a.length >> 1;
    return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
};
const quantile = (arr, q) => [...arr].sort((x, y) => x - y)[Math.round(q * (arr.length - 1))];

const audio = Object.assign(new Audio(), { preload: 'auto' });
audio.setAttribute('playsinline', '');
audio.preservesPitch = true;
audio.webkitPreservesPitch = true;

const s = {
    track: null,
    key: '',
    playing: false,
    duration: 0,
    lyrics: [],
    lyricIndex: -1,
    currentLyric: '',
    pendingLyric: null,
    prog: null,
    progId: '',
    lyricAbort: null,
    choice: null,
    statusMax: 0,
    statusAt: 0,
    loadedId: ''
};

let animTimer;
let progTimer;

const clk = {
    ok: false, playing: false, pos: 0, off: 0, hist: [], pend: null, epoch: 0,
    get() {
        if (!this.ok) return 0;
        const p = this.playing ? Date.now() + this.off : this.pos;
        return clamp(p, 0, s.duration || Infinity);
    },
    hold(pos) {
        Object.assign(this, { ok: true, playing: false, pos, hist: [], pend: null });
        this.epoch++;
    },
    start(pos, at) {
        Object.assign(this, { ok: true, playing: true, off: pos - at, pend: null });
        this.hist = [this.off];
        this.epoch++;
    },
    feed(pos, at) {
        const o = pos - at;
        if (Math.abs(o - this.off) > CLOCK_SNAP) {
            if (this.pend !== null && Math.abs(o - this.pend) < CLOCK_CONFIRM) {
                this.off = o; this.hist = [o]; this.pend = null; this.epoch++;
            } else this.pend = o;
            return;
        }
        this.pend = null;
        this.hist.push(o);
        if (this.hist.length > CLOCK_N) this.hist.shift();
        this.off = quantile(this.hist, CLOCK_Q);
    }
};

const getTruePosition = () => clk.get();

const ax = {
    phase: 'idle', phaseAt: 0, L: 0, seekCt: 0, seekEpoch: 0, learn: false, fresh: false,
    tries: 0, lastSeekAt: 0, hist: [], retryAt: 0, baseCt: 0
};

const LKEY = 'syncL';
function loadL() {
    try {
        const raw = localStorage.getItem(LKEY);
        const v = Number(raw);
        if (raw !== null && v >= 0 && v <= L_MAX) return v;
    } catch (e) { }
    return IOS ? 1200 : 150;
}
function saveL() { try { localStorage.setItem(LKEY, String(Math.round(ax.L))); } catch (e) { } }
ax.L = loadL();

function setPhase(p) { ax.phase = p; ax.phaseAt = Date.now(); }

function canSeek(ms) {
    const t = ms / 1000, r = audio.seekable;
    for (let i = 0; i < r.length; i++) if (r.start(i) <= t + 0.25 && r.end(i) >= t - 0.25) return true;
    return false;
}

function beginSettle(ct, learn) {
    ax.seekCt = ct;
    ax.learn = learn;
    ax.seekEpoch = clk.epoch;
    ax.hist = [];
    setPhase('settle');
}

function seekAudio(ms) {
    const dur = Number.isFinite(audio.duration) ? audio.duration * 1000 : Infinity;
    const tgt = clamp(ms, 0, dur - 300);
    if (!canSeek(tgt)) return false;
    try { audio.currentTime = tgt / 1000; } catch (e) { return false; }
    ax.lastSeekAt = Date.now();
    beginSettle(tgt / 1000, true);
    return true;
}

function setRate(r) {
    if (Math.abs(audio.playbackRate - r) > 0.002) audio.playbackRate = r;
}

function loadSrc(id) {
    audio.src = `${AUDIO_API}?videoId=${encodeURIComponent(id)}`;
    s.loadedId = id;
    ax.tries = 0;
    ax.fresh = false;
    ax.hist = [];
    ax.lastSeekAt = 0;
    setPhase('align');
}

const warmed = new Set();

function prewarm(d) {
    const id = d?.videoId;
    if (!id || warmed.has(id) || s.choice === 'no') return;
    warmed.add(id);
    fetch(`${AUDIO_API}?videoId=${encodeURIComponent(id)}`, {
        mode: 'no-cors',
        cache: 'no-store',
        credentials: 'omit',
        headers: { Range: 'bytes=0-1' }
    }).catch(() => warmed.delete(id));
}

function startAudio() {
    const id = s.track?.videoId;
    if (!id) return;
    if (s.loadedId !== id) loadSrc(id);
    audio.play().catch(() => { });
}

audio.addEventListener('error', () => {
    s.loadedId = '';
    ax.retryAt = Date.now() + 3000;
});
audio.addEventListener('waiting', () => { ax.hist = []; });

function align(now) {
    const target = clk.get();
    const want = target + ax.L;
    const cur = audio.currentTime * 1000;
    if (Math.abs(want - cur) < 250) return beginSettle(audio.currentTime, false);
    if (seekAudio(want)) return;
    if (target < 1500 || now - ax.phaseAt > 12000) beginSettle(audio.currentTime, false);
}

function settle(now) {
    if (now - ax.phaseAt > SETTLE_TIMEOUT) return setPhase('align');
    if (audio.readyState < 3 || audio.paused) return;
    if (audio.currentTime - ax.seekCt < SETTLE_MIN) return;
    setPhase('track');
    ax.hist = [];
}

function track(now) {
    if (audio.readyState < 3) { ax.hist = []; return; }

    const target = clk.get();
    ax.hist.push(target - audio.currentTime * 1000);
    if (ax.hist.length > 5) ax.hist.shift();
    if (ax.hist.length < 3) return;
    const d = median(ax.hist);

    if (ax.learn) {
        ax.learn = false;
        if (ax.seekEpoch === clk.epoch && Math.abs(d) < 4000) {
            ax.L = clamp(ax.L + 0.7 * d, 0, L_MAX);
            saveL();
            ax.fresh = ax.tries++ < 3;
        }
    }

    const thr = ax.fresh ? FRESH_MS : HARD_MS;
    const cool = ax.fresh ? 0 : SEEK_COOLDOWN;
    ax.fresh = false;

    if (Math.abs(d) > thr && now - ax.lastSeekAt >= cool) {
        if (seekAudio(target + ax.L)) { setRate(1); return; }
    }

    const dead = audio.playbackRate === 1 ? DEAD_ON : DEAD_OFF;
    setRate(Math.abs(d) < dead ? 1 : 1 + clamp(d * RATE_GAIN, -RATE_MAX, RATE_MAX));
}

const wantAudio = () => s.playing && s.choice === 'yes' && !!s.track?.videoId;

function syncAudio() {
    if (!wantAudio()) {
        if (!audio.paused) audio.pause();
        if (ax.phase !== 'idle') setPhase('idle');
        return;
    }

    const now = Date.now();
    const id = s.track.videoId;

    if (s.loadedId !== id) {
        if (now < ax.retryAt) return;
        loadSrc(id);
        audio.play().catch(() => { });
        return;
    }

    if (audio.readyState < 1) {
        if (audio.paused) audio.play().catch(() => { });
        return;
    }

    if (audio.paused) {
        if (ax.phase !== 'settle') setPhase('align');
        audio.play().catch(() => { });
    }
    if (audio.seeking) return;

    if (ax.phase === 'idle') setPhase('align');
    if (ax.phase === 'align') return align(now);
    if (ax.phase === 'settle') return settle(now);
    track(now);
}

function renderTrack() {
    const el = $('now-playing');
    if (!el || !s.track) return;

    const { artists, name, trackLink, duration } = s.track;

    const link = Object.assign(document.createElement('a'), {
        className: 'no-favicon',
        href: trackLink || '#',
        target: '_blank',
        rel: 'noopener noreferrer',
        textContent: name || 'Bilinmeyen şarkı'
    });

    const time = Object.assign(document.createElement('span'), {
        id: 'progress-time',
        textContent: fmt(getTruePosition())
    });

    el.replaceChildren(
        `🎧 ${artists || 'Bilinmeyen sanatçı'} - `,
        link,
        ' | ',
        time,
        `/${duration || fmt(s.duration)}`
    );
}

function ensureLyrics() {
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
            time: m * 60000 + sc * 1000 + (f ? Number(`0.${f}`) * 1000 : 0),
            text: t.trim()
        }))
        .sort((a, b) => a.time - b.time);

async function loadLyrics(d) {
    s.lyricAbort?.abort();
    const ctrl = (s.lyricAbort = new AbortController());
    const key = s.key;

    const params = new URLSearchParams({
        artist_name: d.artists || '',
        track_name: d.name || '',
        album_name: d.album || '',
        duration: Math.round((Number(d.durationMs) || toSec(d.duration) * 1000) / 1000)
    });

    let lyrics;
    try {
        const r = await fetch(`https://lrclib.net/api/get?${params}`, { signal: ctrl.signal });
        if (!r.ok) throw new Error(r.status);
        const { syncedLyrics } = await r.json();
        lyrics = syncedLyrics ? parseLyrics(syncedLyrics) : { error: true };
    } catch (e) {
        if (e.name === 'AbortError') return;
        lyrics = { error: true };
    }

    if (key !== s.key) return;
    s.lyrics = lyrics;
    renderLyrics();
}

function getCurrentLyric(lines, currentMs) {
    let found = null;
    for (const line of lines) {
        if (line.time > currentMs) break;
        found = line.text;
    }
    return found || null;
}

function resetLyricAnim() {
    clearTimeout(animTimer);
    s.currentLyric = '';
    s.pendingLyric = null;
    $('cube')?.classList.remove('animate', 'show-next');
    if ($('bottom')) $('bottom').textContent = '';
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
        front.textContent = 'bu şarkı sözleri, henüz eşzamanlı değil.';
        return;
    }
    if (!s.lyrics.length) return;

    triggerCubeAnimation(getCurrentLyric(s.lyrics, getTruePosition()) || '...');
}

const removePrompt = () => $('music-consent')?.remove();

function removeStatus() {
    clearTimeout(progTimer);
    s.prog = null;
    s.statusMax = 0;
    $('music-status')?.remove();
}

function bufferedAhead() {
    const b = audio.buffered;
    const t = audio.currentTime;
    for (let i = 0; i < b.length; i++) {
        if (b.start(i) <= t + 0.5 && b.end(i) >= t) return b.end(i) - t;
    }
    return 0;
}

function audioFlowing() {
    return !audio.paused && !audio.seeking && audio.readyState >= 3 && audio.currentTime - ax.baseCt >= 1;
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
    const el = $('music-status');
    if (!el) return;

    if (audioFlowing()) {
        removeStatus();
        return;
    }

    s.statusMax = Math.max(s.statusMax, statusPercent());
    const txt = `hazırlanıyor...${Math.min(99, Math.floor(s.statusMax))}%`;
    if (el.textContent !== txt) el.textContent = txt;
}

async function pollProgress() {
    clearTimeout(progTimer);
    const id = s.track?.videoId;
    if (!$('music-status') || !id) return;

    try {
        const r = await fetch(`${AUDIO_API}/progress?videoId=${encodeURIComponent(id)}`, {
            cache: 'no-store',
            credentials: 'omit'
        });
        if (r.ok) {
            s.prog = await r.json();
            s.progId = id;
            updateStatus();
        }
    } catch (e) { }

    progTimer = setTimeout(pollProgress, 700);
}

function showStatus() {
    if (s.choice !== 'yes' || !s.playing || $('music-status')) return;
    const el = Object.assign(document.createElement('div'), { id: 'music-status' });
    el.style.textAlign = 'center';
    const host = $('lyrics');
    host ? host.after(el) : document.body.append(el);
    s.statusAt = performance.now();
    s.statusMax = 0;
    updateStatus();
    pollProgress();
}

['loadstart', 'seeking', 'waiting', 'stalled'].forEach(ev =>
    audio.addEventListener(ev, () => { ax.baseCt = audio.currentTime; })
);
audio.addEventListener('loadstart', showStatus);
audio.addEventListener('progress', updateStatus);
audio.addEventListener('loadedmetadata', updateStatus);
audio.addEventListener('durationchange', updateStatus);
audio.addEventListener('timeupdate', updateStatus);

function showPrompt() {
    const host = $('lyrics');
    if (s.choice !== null || $('music-consent') || !s.playing || !host) return;

    const el = document.createElement('div');
    el.id = 'music-consent';
    el.style.textAlign = 'center';
    el.innerHTML = `
        <div>beraber dinleyelim mi?</div>
        <div>
            <span data-action="yes" style="cursor:pointer">olur</span>
            <span> / </span>
            <span data-action="no" style="cursor:pointer">yok ya</span>
        </div>`;
    host.after(el);

    el.addEventListener('click', ({ target }) => {
        const action = target.dataset?.action;
        if (!action) return;

        s.choice = action;
        removePrompt();

        if (action === 'yes') {
            showStatus();
            return startAudio();
        }
        removeStatus();
        audio.pause();
    });
}

function handleData(d, t0 = Date.now(), t1 = t0) {
    ensureLyrics();

    if (!d || d.error || d.type !== 'track') {
        Object.assign(s, { track: null, key: '', playing: false, lyrics: [], lyricIndex: -1, loadedId: '' });
        clk.ok = false;
        removePrompt();
        removeStatus();
        audio.pause();
        setPhase('idle');
        resetLyricAnim();
        if ($('front')) $('front').textContent = '';
        if ($('now-playing')) $('now-playing').textContent = d?.error || '';
        return;
    }

    const key = [d.trackLink, d.videoId, d.name, d.artists].join('|');
    const changed = key !== s.key;

    s.track = d;
    s.playing = !!d.isPlaying;
    s.duration = Number(d.durationMs) || toSec(d.duration) * 1000;

    const tMid = (t0 + t1) / 2;
    const rtt = t1 - t0;
    const prog = Number(d.progressMs ?? toSec(d.progress) * 1000) || 0;
    const age = s.playing ? Math.max(0, Number(d.ageMs) || 0) : 0;
    const apiPos = Math.max(0, prog + age + LEAD_MS);

    if (!s.playing) clk.hold(apiPos);
    else if (changed || !clk.playing || !clk.ok) clk.start(apiPos, tMid);
    else if (rtt <= RTT_MAX) clk.feed(apiPos, tMid);

    renderTrack();

    if (changed) {
        Object.assign(s, { key, lyrics: [], lyricIndex: -1, loadedId: '' });
        audio.pause();
        removeStatus();
        ax.retryAt = 0;
        setPhase('idle');
        resetLyricAnim();
        if ($('front')) $('front').textContent = 'yükleniyor...';
        loadLyrics(d);
    }

    if (s.playing) prewarm(d);

    if (!s.playing) {
        removePrompt();
        removeStatus();
        return;
    }

    if (s.choice === null) showPrompt();

    renderLyrics();
}

let busy = false;
let timer;

async function poll() {
    if (busy) return;
    busy = true;

    try {
        const t0 = Date.now();
        const r = await fetch(`${POLL_URL}?t=${t0}`, { cache: 'no-store', credentials: 'omit' });
        if (!r.ok) throw new Error(`API ${r.status}`);
        const data = await r.json();
        handleData(data, t0, Date.now());
    } catch (e) { }

    busy = false;
    clearTimeout(timer);
    const fast = clk.pend !== null || (clk.ok && clk.playing && clk.hist.length < 3);
    timer = setTimeout(poll, fast ? 1200 : POLL_MS);
}

ensureLyrics();
poll();

setInterval(() => {
    const el = $('progress-time');
    if (el && s.track) el.textContent = fmt(getTruePosition());
    renderLyrics();
    updateStatus();
    syncAudio();
}, TICK_MS);

const resume = () => {
    if (document.hidden) return;
    ax.hist = [];
    ax.retryAt = 0;
    poll();
};
document.addEventListener('visibilitychange', resume);
window.addEventListener('pageshow', resume);
