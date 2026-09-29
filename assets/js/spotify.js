const POLL_URL = 'https://akakadir.vercel.app/api/now-playing';
const AUDIO_API = 'https://api.akakadir.art/api/audio';
const POLL_MS = 7000;
const TICK_MS = 300;
const OFFSET_MS = -100;

const IOS = /iP(hone|ad|od)/.test(navigator.userAgent) ||
            (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const HARD_DRIFT = 2000;
const SEEK_COOLDOWN = 6000;
const SEEK_GRACE = 3000;
const SEEK_LEAD = 300;
const CLOCK_SNAP = 1500;
const CLOCK_BLEND = 0.3;

const $ = id => document.getElementById(id);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const toSec = v => String(v || '0:00').split(':').reduce((a, b) => a * 60 + Number(b), 0);
const fmt = ms => {
    const t = Math.max(0, (ms / 1000) | 0);
    return `${(t / 60) | 0}:${String(t % 60).padStart(2, '0')}`;
};

const audio = Object.assign(new Audio(), { preload: 'auto' });
audio.setAttribute('playsinline', '');

const s = {
    track: null,
    key: '',
    playing: false,
    duration: 0,
    lyrics: [],
    lyricIndex: -1,
    lyricAbort: null,
    choice: null,
    run: 0,
    counting: false,
    loadedId: ''
};

const ax = { lastSeekAt: 0, graceUntil: 0, buffering: false, retryAt: 0 };

const clk = { pos: 0, at: 0, lastApiPos: -1 };

const getTruePosition = () => {
    if (!s.playing) return clk.pos;
    const p = clk.pos + (performance.now() - clk.at);
    return Math.min(Math.max(0, p), s.duration || Infinity);
};

function syncClockWithAPI(apiPos) {
    if (apiPos === clk.lastApiPos) return;
    clk.lastApiPos = apiPos;

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
    try {
        audio.currentTime = Math.max(0, ms + SEEK_LEAD) / 1000;
    } catch (e) { return; }
    const now = performance.now();
    ax.lastSeekAt = now;
    ax.graceUntil = now + SEEK_GRACE;
}

function loadSrc(id) {
    audio.src = `${AUDIO_API}?videoId=${encodeURIComponent(id)}`;
    s.loadedId = id;
    ax.lastSeekAt = 0;
    ax.graceUntil = 0;
    ax.buffering = true;
}

function startIOSAudio() {
    const id = s.track?.videoId;
    if (!id) return;
    if (s.loadedId !== id) loadSrc(id);
    audio.play().catch(() => {});
}

if (IOS) {
    audio.addEventListener('waiting', () => { ax.buffering = true; });
    audio.addEventListener('stalled', () => { ax.buffering = true; });
    audio.addEventListener('playing', () => { ax.buffering = false; });
    audio.addEventListener('canplay', () => { ax.buffering = false; });
    audio.addEventListener('seeked', () => { ax.graceUntil = performance.now() + SEEK_GRACE; });
    audio.addEventListener('loadedmetadata', () => {
        if (!(s.playing && s.choice === 'yes' && s.track?.videoId)) return;
        seekTo(getTruePosition());
    });
    audio.addEventListener('error', () => {
        s.loadedId = '';
        ax.retryAt = performance.now() + 3000;
    });
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

function showLyric(i) {
    const cube = $('cube'), front = $('front'), bottom = $('bottom');
    if (!cube || !front || !bottom) return;

    front.textContent = s.lyrics[i]?.text || '';
    bottom.textContent = s.lyrics[i + 1]?.text || '';

    cube.classList.remove('animate', 'show-next');
    void cube.offsetWidth;
    cube.classList.add('animate');

    s.lyricIndex = i;
}

function renderLyrics() {
    const front = $('front');
    if (!front || !s.track) return;

    if (s.lyrics.error) {
        front.textContent = 'bu şarkı sözleri, henüz eşzamanlı değil.';
        return;
    }
    if (!s.lyrics.length) return;

    const now = getTruePosition();
    let i = s.lyrics.length - 1;
    while (i > 0 && now < s.lyrics[i].time) i--;

    if (i !== s.lyricIndex) showLyric(i);
}

const removePrompt = () => $('music-consent')?.remove();

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
            if (IOS) return startIOSAudio();
            return countdown();
        }
        cancelCountdown();
        audio.pause();
    });
}

function cancelCountdown() {
    s.run++;
    s.counting = false;
    $('music-countdown')?.remove();
}

async function countdown() {
    if (IOS) return;
    if (!s.playing || s.choice !== 'yes' || !s.track?.videoId) return;

    cancelCountdown();
    const run = s.run;
    s.counting = true;
    audio.pause();

    const el = Object.assign(document.createElement('div'), { id: 'music-countdown' });
    el.style.textAlign = 'center';
    const host = $('lyrics');
    host ? host.after(el) : document.body.append(el);

    for (const n of [3, 2, 1]) {
        el.textContent = n;
        await sleep(1000);
        if (run !== s.run) return;
    }

    el.remove();
    s.counting = false;
}

const wantAudio = () => s.playing && s.choice === 'yes' && !s.counting && !!s.track?.videoId;

function syncAudioPC() {
    if (!wantAudio()) {
        if (!audio.paused) audio.pause();
        return;
    }

    const id = s.track.videoId;
    if (s.loadedId !== id) {
        audio.src = `${AUDIO_API}?videoId=${encodeURIComponent(id)}`;
        s.loadedId = id;
    }

    if (audio.readyState < 1 || audio.seeking) return;

    const targetPos = getTruePosition();
    const currentAudioPos = audio.currentTime * 1000;
    const drift = targetPos - currentAudioPos;

    if (audio.paused || Math.abs(drift) > 1000) {
        audio.currentTime = Math.max(0, targetPos) / 1000;
        audio.playbackRate = 1;
        if (audio.paused) audio.play().catch(() => {});
        return;
    }

    if (audio.readyState < 3) return;

    if (Math.abs(drift) > 30) {
        const correction = drift / 1000;
        audio.playbackRate = Math.max(0.75, Math.min(1.25, 1 + correction));
    } else {
        audio.playbackRate = 1;
    }
}

function syncAudioIOS() {
    if (!wantAudio()) {
        if (!audio.paused) audio.pause();
        return;
    }

    const now = performance.now();
    const id = s.track.videoId;

    if (s.loadedId !== id) {
        if (now < ax.retryAt) return;
        loadSrc(id);
    }

    if (audio.readyState < 1 || audio.seeking) return;

    const target = getTruePosition();
    const drift = target - audio.currentTime * 1000;

    if (audio.paused) {
        if (Math.abs(drift) > 400) seekTo(target);
        audio.play().catch(() => {});
        return;
    }

    if (ax.buffering || audio.readyState < 3 || now < ax.graceUntil) return;

    if (Math.abs(drift) > HARD_DRIFT && now - ax.lastSeekAt > SEEK_COOLDOWN) {
        seekTo(target);
    }
}

const syncAudio = IOS ? syncAudioIOS : syncAudioPC;

function handleData(d, rtt = 0) {
    ensureLyrics();

    if (!d || d.error || d.type !== 'track') {
        Object.assign(s, { track: null, key: '', playing: false, lyrics: [], lyricIndex: -1, loadedId: '' });
        removePrompt();
        cancelCountdown();
        audio.pause();
        if ($('now-playing')) $('now-playing').textContent = d?.error || '';
        return;
    }

    const key = [d.trackLink, d.videoId, d.name, d.artists].join('|');
    const changed = key !== s.key;

    s.track = d;
    s.playing = !!d.isPlaying;
    s.duration = Number(d.durationMs) || toSec(d.duration) * 1000;

    let rawApiPos = Number(d.progressMs ?? toSec(d.progress) * 1000) || 0;
    rawApiPos = Math.max(0, rawApiPos - OFFSET_MS + (IOS && s.playing ? rtt / 2 : 0));

    if (changed || !s.playing) {
        clk.pos = rawApiPos;
        clk.at = performance.now();
        clk.lastApiPos = rawApiPos;
    } else {
        syncClockWithAPI(rawApiPos);
    }

    renderTrack();

    if (changed) {
        Object.assign(s, { key, lyrics: [], lyricIndex: -1, loadedId: '' });
        audio.pause();
        ax.buffering = false;
        ax.retryAt = 0;
        cancelCountdown();
        if ($('front')) $('front').textContent = 'yükleniyor...';
        loadLyrics(d);
    }

    if (!s.playing) {
        cancelCountdown();
        removePrompt();
        return;
    }

    if (s.choice === null) showPrompt();
    else if (s.choice === 'yes' && changed) countdown();

    renderLyrics();
}

let busy = false;
let timer;

async function poll() {
    if (busy) return;
    busy = true;

    try {
        const t0 = performance.now();
        const r = await fetch(`${POLL_URL}?t=${Date.now()}`, { cache: 'no-store', credentials: 'omit' });
        if (!r.ok) throw new Error(`API ${r.status}`);
        const data = await r.json();
        handleData(data, performance.now() - t0);
    } catch (e) { }

    busy = false;
    clearTimeout(timer);
    timer = setTimeout(poll, POLL_MS);
}

ensureLyrics();
poll();

setInterval(() => {
    const el = $('progress-time');
    if (el && s.track) el.textContent = fmt(getTruePosition());
    renderLyrics();
    syncAudio();
}, TICK_MS);

const resume = () => {
    if (document.hidden) return;
    ax.graceUntil = 0;
    ax.lastSeekAt = 0;
    poll();
};
document.addEventListener('visibilitychange', resume);
window.addEventListener('pageshow', resume);
