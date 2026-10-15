'use strict';

/* ═══════════════════════════════════════════════════════════════════════════════
   ENDPOINTS
═══════════════════════════════════════════════════════════════════════════════ */
const POLL_URL  = 'https://akakadir.vercel.app/api/now-playing';
const AUDIO_API = 'https://api.akakadir.art/api/audio';

/* ═══════════════════════════════════════════════════════════════════════════════
   PLATFORM
═══════════════════════════════════════════════════════════════════════════════ */
const UA  = navigator.userAgent;
const IOS = /iP(hone|ad|od)/.test(UA) ||
            (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/* ═══════════════════════════════════════════════════════════════════════════════
   POLLING
═══════════════════════════════════════════════════════════════════════════════ */
const POLL_MS_PLAYING = 7_000;
const POLL_MS_PAUSED  = 15_000;
const FETCH_TIMEOUT   = 6_000;
const MAX_POLL_FAILS  = 3;

/* ═══════════════════════════════════════════════════════════════════════════════
   DISPLAY
═══════════════════════════════════════════════════════════════════════════════ */
const TICK_MS            = 300;
const LEAD_MS            = 0;
const FILL_MAX_MS        = 6_000;
const MARQUEE_PX_PER_SEC = 25;

/* ═══════════════════════════════════════════════════════════════════════════════
   CLOCK / SYNC
═══════════════════════════════════════════════════════════════════════════════ */
const CLOCK_SNAP  = 1_500;
const CLOCK_BLEND = 0.3;

/* ═══════════════════════════════════════════════════════════════════════════════
   DRIFT CORRECTION  —  seek-only; playbackRate is NEVER changed anywhere
═══════════════════════════════════════════════════════════════════════════════ */
const HARD_DRIFT    = 400;    // ms: seek when drift exceeds this
const SEEK_COOLDOWN = 2_000;  // ms: minimum gap between two seeks
const SEEK_GRACE    = 2_500;  // ms: suppress drift checks right after a seek

/* ═══════════════════════════════════════════════════════════════════════════════
   PRE-FETCH ENGINE
═══════════════════════════════════════════════════════════════════════════════ */
const PF_REANCHOR_MS  = 4_000; // ms: drift-correct muted bg audio this often
const PF_ACTIVATE_LAG = 80;    // ms: estimated click → first-sample latency (seek-ahead)

/* ═══════════════════════════════════════════════════════════════════════════════
   AUDIO LOADING
═══════════════════════════════════════════════════════════════════════════════ */
const MAX_AUDIO_FAILS = 3;
const LOAD_TIMEOUT    = 60_000;

/* ═══════════════════════════════════════════════════════════════════════════════
   SPAM DETECTION
═══════════════════════════════════════════════════════════════════════════════ */
const SPAM_CLICKS = 11;
const SPAM_GAP_MS = 1_000;
const SPAM_MS     = 3_000;
const SPAM_LABEL  = 'ne deniyon yrrm';
const STALE_LABEL = 'bağlantı koptu';

const ENDED_RECHECK_MS = 2_500;

/* ═══════════════════════════════════════════════════════════════════════════════
   PROGRESS STAGE
═══════════════════════════════════════════════════════════════════════════════ */
const STAGE_RANK     = { resolving: 1, downloading: 2, uploading: 3, ready: 4 };
const PROG_POLL_FAST = 1_000;
const PROG_POLL_SLOW = 2_000;

/* ═══════════════════════════════════════════════════════════════════════════════
   PRE-FETCH STATE MACHINE
   ─────────────────────────────────────────────────────────────────────────────
   IDLE    → no source loaded
   LOADING → src assigned; waiting for canplay
   READY   → canplay fired; playing muted in background (primed for instant switch-on)
   ACTIVE  → user-activated; audible playback
   FAILED  → load error; exponential back-off pending
   ─────────────────────────────────────────────────────────────────────────────
   Transitions driven by:
     IDLE → LOADING        startPrefetch()          (on every handleData with live track)
     LOADING → READY       canplay event             (s.choice null)
     LOADING → ACTIVE      canplay event             (s.choice 'yes')
     READY → ACTIVE        activatePrefetch()        (user clicks switch on)
     ACTIVE → READY        deactivatePrefetch()      (user clicks switch off)
     * → IDLE              pfWantLoad() false        (Spotify paused / no track)
     * → FAILED            pfFail()                  (MAX_AUDIO_FAILS exceeded)
     FAILED → LOADING      resetPfFailures()         (retry / track change)
═══════════════════════════════════════════════════════════════════════════════ */
const PF = Object.freeze({
    IDLE:    'idle',
    LOADING: 'loading',
    READY:   'ready',
    ACTIVE:  'active',
    FAILED:  'failed',
});

/* ═══════════════════════════════════════════════════════════════════════════════
   DOM HELPERS
═══════════════════════════════════════════════════════════════════════════════ */
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

/* ═══════════════════════════════════════════════════════════════════════════════
   URL / TIME HELPERS
═══════════════════════════════════════════════════════════════════════════════ */
const enc         = encodeURIComponent;
const audioUrl    = id => `${AUDIO_API}?videoId=${enc(id)}`;
const progressUrl = id => `${AUDIO_API}/progress?videoId=${enc(id)}`;

const toSec = v => String(v || '0:00').split(':').reduce((a, b) => a * 60 + Number(b), 0);
const fmt   = ms => {
    const t = Math.max(0, (ms / 1000) | 0);
    return `${(t / 60) | 0}:${String(t % 60).padStart(2, '0')}`;
};
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

function fetchT(url, opts = {}, ms = FETCH_TIMEOUT) {
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), ms);
    return fetch(url, { ...opts, signal: ctrl.signal }).finally(() => clearTimeout(timer));
}

/* ═══════════════════════════════════════════════════════════════════════════════
   AUDIO ELEMENT  —  always starts muted; unmuted only in ACTIVE state
═══════════════════════════════════════════════════════════════════════════════ */
const audio = Object.assign(new Audio(), { preload: 'auto', muted: true });
audio.setAttribute('playsinline', '');

/* ═══════════════════════════════════════════════════════════════════════════════
   APPLICATION STATE
═══════════════════════════════════════════════════════════════════════════════ */
const s = {
    track: null, key: '', playing: false, stale: false, fails: 0, duration: 0,
    lyrics: [], currentLyric: '', lineStart: -1, lyricAbort: null,
    prog: null, progId: '',
    choice: null,                      // null | 'yes'
    statusOn: false, label: 'beraber',
    clicks: 0, lastClick: 0, spamUntil: 0,
    statusMax: 0, statusRank: 0, statusAt: 0,
};

/* Pre-fetch engine state */
const pf = {
    state:        PF.IDLE,
    loadedId:     '',
    loadAt:       0,           // performance.now() when pfLoadSrc() was called
    lastSeekAt:   0,           // performance.now() of last seekTo()
    graceUntil:   0,           // suppress drift checks until this timestamp
    lastReanchor: 0,           // performance.now() of last READY-state re-anchor
    baseCt:       0,           // audio.currentTime at last stall / seek / loadstart
    buffering:    false,
    fails:        0,
    retryAt:      0,
    gestureOk:    !IOS,        // true once any user gesture has been received
};

/* Live Spotify clock */
const clk = { pos: 0, at: 0, lastStamp: '' };

/* Timer handles */
let pollBusy  = false;
let pollTimer;
let progTimer;
let progRun = 0;

/* ═══════════════════════════════════════════════════════════════════════════════
   CLOCK
═══════════════════════════════════════════════════════════════════════════════ */

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
        clk.at  = performance.now();
        return;
    }

    const expected = getTruePosition();
    const diff     = apiPos - expected;

    if (Math.abs(diff) > CLOCK_SNAP) {
        clk.pos = apiPos;                                              // hard snap
    } else if (pf.state === PF.IDLE || pf.state === PF.FAILED) {
        clk.pos = apiPos;                                              // no audio — accept as-is
    } else {
        clk.pos = expected + diff * (diff > 0 ? 0.7 : CLOCK_BLEND);   // smooth blend
    }
    clk.at = performance.now();
}

/* ═══════════════════════════════════════════════════════════════════════════════
   PRE-FETCH ENGINE  —  helpers
═══════════════════════════════════════════════════════════════════════════════ */

/** True when a live, sourced track exists and audio should pre-fetch. */
const pfWantLoad = () => s.playing && !s.stale && !!s.track?.videoId;

/** True when the audio element has a source loaded (any non-idle/non-failed state). */
const pfHasSrc  = () =>
    pf.state === PF.LOADING || pf.state === PF.READY || pf.state === PF.ACTIVE;

/** Seconds of audio buffered ahead of the current playback cursor. */
function bufferedAhead() {
    const b = audio.buffered, t = audio.currentTime;
    for (let i = 0; i < b.length; i++) {
        if (b.start(i) <= t + 0.5 && b.end(i) >= t) return b.end(i) - t;
    }
    return 0;
}

/** True when audio is actively emitting samples (flowing, not stalled). */
function audioFlowing() {
    return !audio.paused && !audio.seeking &&
           audio.readyState >= 3 &&
           audio.currentTime - pf.baseCt >= 1;
}

/**
 * Seek to a target position (ms).
 * playbackRate is NEVER modified — not here, not anywhere else in this file.
 */
function seekTo(ms) {
    const sec = Math.max(0, ms) / 1_000;
    try { audio.currentTime = sec; } catch { return; }
    const now       = performance.now();
    pf.lastSeekAt   = now;
    pf.graceUntil   = now + SEEK_GRACE;
    pf.lastReanchor = now;
}

/**
 * Load a new source into the audio element.
 * Always starts muted; resets the pre-fetch engine tracking fields.
 */
function pfLoadSrc(id) {
    if (audio.src) {
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
    }
    audio.muted        = true;
    audio.playbackRate = 1;
    audio.src          = audioUrl(id);

    pf.loadedId     = id;
    pf.loadAt       = performance.now();
    pf.lastSeekAt   = performance.now();
    pf.graceUntil   = 0;
    pf.lastReanchor = 0;
    pf.buffering    = true;
    pf.state        = PF.LOADING;

    s.statusAt   = performance.now();
    s.statusMax  = 0;
    s.statusRank = 0;
}

/**
 * Attempt muted background play (primes the buffer; required for iOS).
 * No-op if gesture has not yet been received on iOS.
 */
function pfTryMutedPlay() {
    if (!pf.gestureOk) return;
    audio.muted = true;
    audio.play().catch(err => {
        if (err?.name === 'NotAllowedError') pf.gestureOk = false; // lost gesture blessing
        else if (err?.name !== 'AbortError')
            console.warn('[pf] muted play error:', err?.name);
    });
}

/**
 * Call on any user interaction to unlock the audio element on iOS.
 * Safe to call repeatedly — becomes a no-op after the first successful gesture.
 */
function onGesture() {
    if (pf.gestureOk) return;
    pf.gestureOk = true;
    // Resume stalled pre-fetch if a source is waiting for a gesture
    if (pfWantLoad() && (pf.state === PF.LOADING || pf.state === PF.READY) && audio.paused) {
        pfTryMutedPlay();
    }
}

/**
 * Kick off background pre-fetch for the current track.
 * Safe to call repeatedly — skips when already loading / loaded.
 *
 * Architecture note:
 *   Called from handleData() as soon as a live track arrives.
 *   The audio element loads and begins buffering silently in the background.
 *   When the user activates the switch, activatePrefetch() simply unmutes it.
 */
function startPrefetch() {
    if (!pfWantLoad()) return;
    const id = s.track.videoId;

    if (pf.loadedId === id && pfHasSrc()) return;          // already in progress
    if (pf.state === PF.FAILED && performance.now() < pf.retryAt) return; // back-off

    pfLoadSrc(id);
    pfTryMutedPlay();
}

/**
 * Activate audible playback — called when user turns the switch on (choice → 'yes').
 *
 *   READY  → unmute + optional micro-seek correction → instant audible audio
 *   ACTIVE → already live; no-op
 *   LOADING → show status; canplay handler will go straight to ACTIVE because s.choice==='yes'
 *   IDLE/FAILED → begin loading now; canplay handler will activate on completion
 */
function activatePrefetch() {
    if (!pfWantLoad()) return;

    switch (pf.state) {

        case PF.READY: {
            // ── Best case: buffered and positioned. Just unmute. ──────────────
            const live  = getTruePosition();
            const drift = live - audio.currentTime * 1_000;
            if (Math.abs(drift) > HARD_DRIFT) seekTo(live + PF_ACTIVATE_LAG);
            audio.muted = false;
            pf.state    = PF.ACTIVE;
            removeStatus();
            if (audio.paused) {
                audio.play().catch(err => {
                    if (err?.name !== 'AbortError')
                        console.warn('[pf] activate play error:', err?.name);
                });
            }
            return;
        }

        case PF.ACTIVE:
            return; // already live

        case PF.LOADING: {
            // ── Still loading: ensure buffering is running (iOS post-gesture) ─
            if (audio.paused && pf.gestureOk) pfTryMutedPlay();
            // canplay handler checks s.choice and jumps straight to ACTIVE.
            showStatus();
            return;
        }

        default: {
            // IDLE or FAILED: begin loading from scratch now.
            if (pf.state === PF.FAILED) resetPfFailures();
            startPrefetch();
            showStatus();
        }
    }
}

/**
 * Deactivate audible playback — called when user turns switch off (choice → null).
 * Keeps muted background pre-fetch running so re-activation stays instant.
 */
function deactivatePrefetch() {
    if (pf.state === PF.ACTIVE) {
        audio.muted = true;
        pf.state    = PF.READY;
        // Re-anchor immediately so the muted audio stays at the live position.
        if (performance.now() - pf.lastSeekAt > 500) seekTo(getTruePosition());
    }
    // LOADING: audio stays muted (it always was); canplay will check s.choice (now null)
    //          and will transition to READY rather than ACTIVE.
}

/** Handle an audio element load / decode failure. */
function pfFail() {
    audio.pause();
    audio.removeAttribute('src');
    audio.load();

    pf.loadedId  = '';
    pf.loadAt    = 0;
    pf.buffering = false;

    if (++pf.fails >= MAX_AUDIO_FAILS) {
        pf.state   = PF.FAILED;
        pf.retryAt = Infinity;  // permanent until track change
        progRun++;
        clearTimeout(progTimer);
    } else {
        pf.state   = PF.IDLE;
        pf.retryAt = performance.now() + 2_000 * (2 ** pf.fails);
    }
    updateStatus();
}

function resetPfFailures() {
    pf.fails   = 0;
    pf.retryAt = 0;
    if (pf.state === PF.FAILED) pf.state = PF.IDLE;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   AUDIO EVENT LISTENERS
═══════════════════════════════════════════════════════════════════════════════ */

audio.addEventListener('waiting', () => { pf.buffering = true; });
audio.addEventListener('stalled', () => { pf.buffering = true; });
audio.addEventListener('playing', () => { pf.buffering = false; });

/**
 * canplay — the central state-machine transition point.
 *
 *   s.choice === 'yes'  → skip READY, jump straight to ACTIVE (instant audible play)
 *   s.choice === null   → enter READY (muted background, primed for next switch-on)
 */
audio.addEventListener('canplay', () => {
    pf.buffering = false;
    if (pf.state !== PF.LOADING)          return;
    if (pf.loadedId !== s.track?.videoId) return;

    if (s.choice === 'yes') {
        // User is waiting for audio — activate immediately.
        const target = getTruePosition() + PF_ACTIVATE_LAG;
        if (Math.abs(target - audio.currentTime * 1_000) > 200) seekTo(target);
        audio.muted = false;
        pf.state    = PF.ACTIVE;
        removeStatus();
        if (audio.paused) {
            audio.play().catch(err => {
                if (err?.name !== 'AbortError')
                    console.warn('[pf] canplay→active play error:', err?.name);
            });
        }
    } else {
        // Background pre-fetch complete: transition to muted READY state.
        pf.state    = PF.READY;
        audio.muted = true;
        const target = getTruePosition();
        if (Math.abs(target - audio.currentTime * 1_000) > 300) seekTo(target);
        if (audio.paused && pf.gestureOk) pfTryMutedPlay();
    }
});

audio.addEventListener('seeked', () => {
    pf.graceUntil = performance.now() + SEEK_GRACE;
});

['loadstart', 'seeking', 'waiting', 'stalled'].forEach(ev =>
    audio.addEventListener(ev, () => { pf.baseCt = audio.currentTime; })
);

audio.addEventListener('loadstart', () => {
    // Show the loading indicator only when the user has already chosen to listen.
    if (s.choice === 'yes' && pf.state === PF.LOADING) showStatus();
});

audio.addEventListener('loadedmetadata', () => {
    if (!pfWantLoad() || pf.loadedId !== s.track?.videoId) return;
    // Seek to the live position as soon as metadata is available so the browser
    // buffers from the correct timestamp rather than from t=0.
    seekTo(getTruePosition());
    if (audio.paused && pf.gestureOk) pfTryMutedPlay();
});

audio.addEventListener('error', () => {
    if (!audio.getAttribute('src'))  return;
    if (audio.error?.code === 1)     return; // MEDIA_ERR_ABORTED — we triggered it
    pfFail();
});

audio.addEventListener('ended', () => {
    poll();
    setTimeout(poll, ENDED_RECHECK_MS);
});

/* ═══════════════════════════════════════════════════════════════════════════════
   SYNC AUDIO  —  main loop body, called every TICK_MS
   ─────────────────────────────────────────────────────────────────────────────
   Handles:
     • Source / state correctness checks
     • READY: periodic re-anchor of muted background audio
     • ACTIVE: audible drift correction via seek (no speed changes)
═══════════════════════════════════════════════════════════════════════════════ */
function syncAudio() {
    const now = performance.now();
    const id  = s.track?.videoId;

    /* 1 ── Nothing to do (Spotify paused / no track / stale) ────────────────── */
    if (!pfWantLoad()) {
        if (!audio.paused) audio.pause();
        if (pfHasSrc()) pf.state = PF.IDLE;
        return;
    }

    /* 2 ── Source mismatch: load the correct track ───────────────────────────── */
    if (pf.loadedId !== id) {
        if (pf.state === PF.FAILED && now < pf.retryAt) return;
        startPrefetch();
        return;
    }

    /* 3 ── LOADING: wait for canplay / loadedmetadata events; enforce timeout ── */
    if (pf.state === PF.LOADING) {
        if (pf.loadAt && now - pf.loadAt > LOAD_TIMEOUT) { pfFail(); return; }
        return; // event-driven; nothing more to do here
    }

    /* 4 ── FAILED: retry when back-off window expires ────────────────────────── */
    if (pf.state === PF.FAILED) {
        if (now >= pf.retryAt) { resetPfFailures(); startPrefetch(); }
        return;
    }

    /* 5 ── READY: keep muted audio alive and drift-corrected ─────────────────── */
    if (pf.state === PF.READY) {
        // Restart if the system or browser paused the muted audio.
        if (audio.paused && pf.gestureOk) pfTryMutedPlay();

        // Periodic re-anchor: keep the muted cursor close to the live position so
        // activation is always within HARD_DRIFT of correct.
        if (now - pf.lastReanchor >= PF_REANCHOR_MS) {
            const target = getTruePosition();
            const drift  = target - audio.currentTime * 1_000;
            if (Math.abs(drift) > HARD_DRIFT && now - pf.lastSeekAt > SEEK_COOLDOWN) {
                seekTo(target);
            } else {
                pf.lastReanchor = now; // update timestamp even when no seek is needed
            }
        }
        return;
    }

    /* 6 ── ACTIVE: audible drift correction (seek-only, no speed changes) ────── */
    if (pf.state === PF.ACTIVE) {
        audio.muted = false; // enforce — never allow accidental mute in active state

        if (audio.readyState < 1 || audio.seeking) return;

        const target = getTruePosition();

        // Edge case: audio ended but Spotify hasn't moved on yet.
        if (audio.ended) {
            if (target < audio.duration * 1_000 - 1_500 && now - pf.lastSeekAt > 1_500) {
                seekTo(target);
                audio.play().catch(() => { });
            }
            return;
        }

        const drift = target - audio.currentTime * 1_000;

        // Recover from unexpected pause.
        if (audio.paused) {
            if (Math.abs(drift) > HARD_DRIFT && now - pf.lastSeekAt > 1_500) seekTo(target);
            audio.play().catch(err => {
                if (err?.name !== 'NotAllowedError' && err?.name !== 'AbortError')
                    console.warn('[pf] active play error:', err?.name);
            });
            return;
        }

        // Clear stale buffering flag when data is flowing again.
        if (pf.buffering && audio.readyState >= 3 && audio.currentTime > pf.baseCt + 0.3) {
            pf.buffering = false;
        }
        if (pf.buffering || audio.readyState < 3 || now < pf.graceUntil) return;

        // Drift correction — one seek, then wait SEEK_COOLDOWN before the next.
        if (Math.abs(drift) > HARD_DRIFT && now - pf.lastSeekAt > SEEK_COOLDOWN) {
            seekTo(target);
        }
    }
}

/* ═══════════════════════════════════════════════════════════════════════════════
   CSS / DOM SETUP
═══════════════════════════════════════════════════════════════════════════════ */

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

/* ═══════════════════════════════════════════════════════════════════════════════
   LABEL / STATUS
═══════════════════════════════════════════════════════════════════════════════ */

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

function removeStatus() {
    progRun++;
    clearTimeout(progTimer);
    s.prog       = null;
    s.statusMax  = 0;
    s.statusRank = 0;
    s.statusOn   = false;
    setLabel('beraber');
}

function statusPercent() {
    const pr      = s.prog && s.progId === s.track?.videoId ? s.prog : null;
    const elapsed = (performance.now() - s.statusAt) / 1_000;
    const frac    = Math.min(1, bufferedAhead() / 5);
    let p;

    if (pr?.stage === 'downloading' || pr?.stage === 'uploading') p = 10 + (pr.percent ?? 0) * 0.5;
    else if (pr?.stage === 'ready')                               p = 60 + 40 * frac;
    else                                                          p = Math.min(10, elapsed * 2.5);

    if (frac > 0) p = Math.max(p, 60 + 40 * frac);
    return p;
}

function updateStatus() {
    if (!s.statusOn) return;
    if (pf.state === PF.FAILED) { setLabel('kodöldüaq'); return; }
    if (pf.state === PF.ACTIVE) { removeStatus(); return; }

    s.statusMax  = Math.max(s.statusMax, statusPercent());
    const pct    = Math.min(99, Math.floor(s.statusMax));
    const pr     = s.prog && s.progId === s.track?.videoId ? s.prog : null;
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
    const id  = s.track?.videoId;
    if (!s.statusOn || !id || pf.state === PF.FAILED) return;

    let delay = PROG_POLL_FAST;
    try {
        const r = await fetchT(progressUrl(id), { cache: 'no-store', credentials: 'omit' }, 3_000);
        if (run !== progRun) return;
        if (r.ok) {
            s.prog   = await r.json();
            s.progId = id;
            // Reset the load-timeout clock while the server is actively processing.
            if (pf.loadAt && /^(resolving|downloading|uploading)$/.test(s.prog.stage)) {
                pf.loadAt = performance.now();
            }
            updateStatus();
            if (s.prog.stage === 'ready') delay = PROG_POLL_SLOW;
        } else {
            delay = PROG_POLL_SLOW;
        }
    } catch {
        delay = PROG_POLL_SLOW;
    }

    if (run !== progRun || !s.statusOn || pf.state === PF.FAILED) return;
    progTimer = setTimeout(pollProgress, delay);
}

function showStatus() {
    // Only show the loading indicator when the user has activated the switch
    // and the pre-fetch is not yet live. When pre-fetch is READY, activation
    // is instant, so showStatus() is never reached in the happy path.
    if (s.choice !== 'yes' || !s.playing) return;
    if (pf.state === PF.ACTIVE)           return;

    if (!s.statusOn) {
        s.statusOn   = true;
        s.statusAt   = performance.now();
        s.statusMax  = 0;
        s.statusRank = 0;
    }
    updateStatus();
    pollProgress();
}

/* ═══════════════════════════════════════════════════════════════════════════════
   TOGGLE LISTEN
═══════════════════════════════════════════════════════════════════════════════ */

function toggleListen() {
    const now = performance.now();
    s.clicks    = now - s.lastClick < SPAM_GAP_MS ? s.clicks + 1 : 1;
    s.lastClick = now;
    if (s.clicks >= SPAM_CLICKS) {
        s.clicks    = 0;
        s.spamUntil = now + SPAM_MS;
        setLabel(s.label);
    }

    onGesture(); // every click counts as a gesture — unlocks audio on iOS

    if (s.choice === 'yes') {
        s.choice = null;
        removeStatus();
        deactivatePrefetch();   // mute + stay READY; re-activation stays instant
        syncControls();
        return;
    }

    s.choice = 'yes';
    resetPfFailures();
    activatePrefetch();
    setLabel(s.label);
    syncControls();
}

/* ═══════════════════════════════════════════════════════════════════════════════
   MARQUEE
═══════════════════════════════════════════════════════════════════════════════ */

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

/* ═══════════════════════════════════════════════════════════════════════════════
   RENDER TRACK
═══════════════════════════════════════════════════════════════════════════════ */

function renderTrack() {
    const el = $('now-playing');
    if (!el || !s.track) return;

    const { artists, name, trackLink, duration } = s.track;

    const link = mk('a', {
        className:   'no-favicon',
        href:        trackLink || '#',
        target:      '_blank',
        rel:         'noopener noreferrer',
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

function updateMediaSession() {
    if (!('mediaSession' in navigator)) return;
    try {
        const d = s.track;
        navigator.mediaSession.metadata = d
            ? new MediaMetadata({
                title:   d.name    || '',
                artist:  d.artists || '',
                album:   d.album   || '',
                artwork: d.albumArt
                    ? [96, 128, 192, 256, 384, 512].map(n => ({ src: d.albumArt, sizes: `${n}x${n}` }))
                    : []
            })
            : null;
        ['seekbackward', 'seekforward', 'seekto', 'previoustrack', 'nexttrack']
            .forEach(a => { try { navigator.mediaSession.setActionHandler(a, () => { }); } catch { } });
    } catch { }
}

/* ═══════════════════════════════════════════════════════════════════════════════
   LYRICS
═══════════════════════════════════════════════════════════════════════════════ */

function ensureLyrics() {
    ensurePlayer();
    const el = $('lyrics');
    if (!el || $('fill')) return;
    el.innerHTML = `
        <div class="ly dim"><span id="front"></span></div>
        <div class="ly"><span id="fill"></span></div>`;
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
        return r.ok ? r.json() : null;
    };

    if (d.album && dur) {
        const p = new URLSearchParams({
            artist_name: artist, track_name: track, album_name: d.album, duration: dur
        });
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
    const timer  = setTimeout(() => { timedOut = true; ctrl.abort(); }, 15_000);

    let lyrics = { error: true };
    try {
        const text   = await fetchSynced(d, ctrl.signal);
        const parsed = text ? parseLyrics(text) : [];
        if (parsed.length) lyrics = parsed;
    } catch (e) {
        if (e.name === 'AbortError' && !timedOut) return;
    } finally {
        clearTimeout(timer);
    }

    if (key !== s.key) return;

    if (lyrics.error && attempt === 0) {
        setTimeout(() => { if (s.key === key) loadLyrics(d, 1); }, 5_000);
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

/* ═══════════════════════════════════════════════════════════════════════════════
   DATA HANDLING
═══════════════════════════════════════════════════════════════════════════════ */

function clearTrack() {
    s.lyricAbort?.abort();
    Object.assign(s, {
        track: null, key: '', playing: false, stale: false, lyrics: [],
    });

    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    audio.muted = true;

    pf.state     = PF.IDLE;
    pf.loadedId  = '';
    pf.loadAt    = 0;
    pf.buffering = false;

    removeStatus();
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
    if (s.stale) { s.stale = false; setLabel(s.label); }

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
        Object.assign(s, { key, lyrics: [] });

        // Tear down the existing audio for the old track.
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
        audio.muted  = true;
        pf.state     = PF.IDLE;
        pf.loadedId  = '';
        pf.loadAt    = 0;
        pf.buffering = false;
        resetPfFailures();

        removeStatus();
        resetLyricAnim();
        showMsg('yükleniyor...');
        renderTrack();
        updateMediaSession();
        loadLyrics(d);
    } else {
        if (!$('progress-time')) renderTrack();
        if ((d.videoId || '') !== prevVid) resetPfFailures();
    }

    if (!s.playing) {
        // Spotify is paused — stop audio and collapse pre-fetch state.
        removeStatus();
        if (!audio.paused) audio.pause();
        if (pfHasSrc()) pf.state = PF.IDLE;
        syncControls();
        return;
    }

    // ── Proactive pre-fetch: begin loading as soon as we have a live track. ───
    // The audio will silently buffer in the background. If the user later
    // activates the switch and the state is READY, activation is instantaneous
    // (just an unmute). If still LOADING, the canplay handler activates on completion.
    startPrefetch();

    renderLyrics();
    syncAudio();
    syncControls();
}

/* ═══════════════════════════════════════════════════════════════════════════════
   POLLING
═══════════════════════════════════════════════════════════════════════════════ */

function onPollFail() {
    if (++s.fails < MAX_POLL_FAILS || s.stale || !s.track) return;
    clk.pos = getTruePosition();
    clk.at  = performance.now();
    s.stale = true;
    setLabel(s.label);
}

async function poll() {
    if (pollBusy) return;
    pollBusy = true;

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

    pollBusy = false;
    clearTimeout(pollTimer);
    pollTimer = setTimeout(poll, (s.playing && !s.stale) ? POLL_MS_PLAYING : POLL_MS_PAUSED);
}

/* ═══════════════════════════════════════════════════════════════════════════════
   BOOT
═══════════════════════════════════════════════════════════════════════════════ */

ensureLyrics();
poll();

// Main tick loop — drives display updates, re-anchoring, and drift correction.
setInterval(() => {
    const now = performance.now();

    if (s.spamUntil && now >= s.spamUntil) {
        s.spamUntil = 0;
        setLabel(s.label);
    }

    if (!document.hidden) {
        setText($('progress-time'), fmt(getTruePosition()));
        renderLyrics();
        updateStatus();
    }

    syncAudio();
}, TICK_MS);

// Resume on visibility restore / page show.
const resume = () => {
    if (document.hidden) return;
    pf.graceUntil = 0;
    pf.lastSeekAt = 0;
    if (pf.state === PF.FAILED) resetPfFailures();
    poll();
};
document.addEventListener('visibilitychange', resume);
window.addEventListener('pageshow', resume);

// iOS: register global gesture listeners so the audio element gets blessed as
// early as possible (e.g. on first scroll or tap), maximising the pre-fetch
// head-start before the user ever finds and clicks the switch.
if (IOS) {
    const iosUnlock = () => onGesture();
    document.addEventListener('touchstart', iosUnlock, { passive: true });
    document.addEventListener('click',      iosUnlock, { passive: true });
}
