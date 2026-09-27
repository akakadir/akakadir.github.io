const POLL_URL = 'https://akakadir.vercel.app/api/now-playing';
const POLL_MS = 5000;

const state = {
  track: null,
  lastTrack: '',
  progress: 0,
  duration: 0,
  playing: false,
  anchor: 0,
  anchorTime: 0,

  lyrics: null,
  lyric: '',
  lyricPending: '',
  lyricToken: 0,
  lyricAbort: null,

  choice: null,
  promptShown: false,

  pollBusy: false,
  pollAgain: false,

  yt: {
    player: null,
    ready: false,
    api: null,
    videoId: '',
    sync: null
  }
};

const fetchJSON = async url => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(r.status);
  return r.json();
};

const seconds = v =>
  String(v || '0:00')
    .split(':')
    .map(Number)
    .reduce((a, b) => a * 60 + b, 0);

const time = ms => {
  const t = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
};

const progress = () => {
  if (!state.playing || !state.anchorTime) {
    return state.progress;
  }

  const p =
    state.anchor +
    performance.now() -
    state.anchorTime;

  return state.duration
    ? Math.min(p, state.duration)
    : p;
};

function styles() {
  if (document.getElementById('spotify-widget-styles')) {
    return;
  }

  const s = document.createElement('style');

  s.id = 'spotify-widget-styles';

  s.textContent = `
    .music-consent{display:block;width:100%;margin-top:14px;text-align:center}
    .music-question{display:block;width:100%}
    .music-options{display:block;width:100%;margin-top:4px;text-align:center}
    .music-option{cursor:pointer}
    .music-option.disabled{pointer-events:none;opacity:.6}
    .youtube-background-player{
      position:fixed;
      width:200px;
      height:200px;
      right:0;
      bottom:0;
      opacity:.001;
      pointer-events:none;
      overflow:hidden;
      z-index:-1
    }
  `;

  document.head.appendChild(s);
}

function lyricStyles() {
  const front = document.getElementById('front');
  if (!front) return;

  let s = document.getElementById('spotify-widget-lyrics-style');

  if (!s) {
    s = document.createElement('style');
    s.id = 'spotify-widget-lyrics-style';
    document.head.appendChild(s);
  }

  const c = getComputedStyle(front);
  const props = [
    'font-family',
    'font-style',
    'font-weight',
    'font-variant',
    'letter-spacing',
    'line-height',
    'text-transform',
    'text-decoration',
    'text-shadow',
    'color',
    'opacity',
    'word-spacing',
    'white-space'
  ];

  const css = props
    .map(p => `${p}:${c.getPropertyValue(p)};`)
    .join('');

  const size = parseFloat(c.fontSize);

  s.textContent = `
    .music-consent,.music-question,.music-options,.music-option{
      ${css}
      ${Number.isFinite(size) ? `font-size:${size * .75}px;` : ''}
    }
  `;
}

function ensureLyrics() {
  const el = document.getElementById('lyrics');
  if (!el) return;

  if (!document.getElementById('cube')) {
    el.innerHTML = `
      <div class="cube" id="cube">
        <div class="side-front" id="front"></div>
        <div class="side-bottom" id="bottom"></div>
      </div>
    `;
  }

  lyricStyles();
}

function parseLyrics(text) {
  return [...text.matchAll(
    /\[(\d+):(\d+)(?:\.(\d+))?\](.*)/g
  )]
    .map(([, m, s, f, t]) => ({
      time:
        +m * 60000 +
        +s * 1000 +
        (f ? +`0.${f}` * 1000 : 0),
      text: t.trim()
    }))
    .sort((a, b) => a.time - b.time);
}

function currentLyric(lines, ms) {
  let text = null;

  for (const line of lines) {
    if (line.time > ms) break;
    text = line.text;
  }

  return text;
}

async function getLyrics(data) {
  if (data.type === 'podcast') {
    return { error: 'podcast liriklerini okuyamam.' };
  }

  state.lyricAbort?.abort();

  const controller = new AbortController();
  state.lyricAbort = controller;

  const params = new URLSearchParams({
    artist_name: data.artists || '',
    track_name: data.name || '',
    album_name: data.album || '',
    duration: Math.round(
      (data.durationMs ||
        seconds(data.duration) * 1000) / 1000
    )
  });

  try {
    const r = await fetch(
      `https://lrclib.net/api/get?${params}`,
      { signal: controller.signal }
    );

    if (!r.ok) {
      return {
        error: 'bu şarkı sözleri, henüz eşzamanlı değil.'
      };
    }

    const d = await r.json();

    return d?.syncedLyrics
      ? { lines: parseLyrics(d.syncedLyrics) }
      : {
          error:
            'bu şarkı sözleri, henüz eşzamanlı değil.'
        };
  } catch (e) {
    return e.name === 'AbortError'
      ? null
      : {
          error:
            'bu şarkı sözleri, henüz eşzamanlı değil.'
        };
  }
}

function animate(text) {
  if (
    !text ||
    state.lyric === text ||
    state.lyricPending === text
  ) {
    return;
  }

  const cube = document.getElementById('cube');
  const front = document.getElementById('front');
  const bottom = document.getElementById('bottom');

  if (!cube || !front || !bottom) return;

  state.lyricPending = text;
  bottom.textContent = text;

  cube.classList.add('animate', 'show-next');

  setTimeout(() => {
    cube.classList.remove('animate', 'show-next');
    front.textContent = text;
    state.lyric = text;
    state.lyricPending = '';
    lyricStyles();
  }, 600);
}

function render() {
  if (!state.track) return;

  const p = progress();
  const t = document.getElementById('progress-time');

  if (t) {
    t.textContent = time(p);
  }

  if (!state.lyrics) return;

  const front = document.getElementById('front');
  if (!front) return;

  if (state.lyrics.error) {
    front.textContent = state.lyrics.error;
    return;
  }

  animate(
    currentLyric(
      state.lyrics.lines,
      p
    ) || '...'
  );
}

function renderTrack() {
  const el = document.getElementById('now-playing');
  if (!el || !state.track) return;

  el.innerHTML =
    `🎧 ${state.track.artists} - ` +
    `<a class="no-favicon" href="${state.track.trackLink}" target="_blank" rel="noopener noreferrer">${state.track.name}</a>` +
    ` | <span id="progress-time">${time(progress())}</span>/${state.track.duration}`;
}

function setClock(data, start, end) {
  let p =
    Number(
      data.progressMs ??
      seconds(data.progress) * 1000
    ) || 0;

  const server = Number(data.serverTime) || 0;

  if (server) {
    const age =
      (start + end) / 2 -
      server;

    if (age > -1000 && age < 10000) {
      p += Math.max(0, age);
    }
  }

  if (data.durationMs) {
    p = Math.min(p, Number(data.durationMs));
  }

  state.progress = Math.max(0, p);
  state.anchor = state.progress;
  state.anchorTime = performance.now();
}

function createPrompt() {
  if (
    state.choice !== null ||
    state.promptShown
  ) {
    return;
  }

  const lyrics = document.getElementById('lyrics');
  if (!lyrics) return;

  const prompt = document.createElement('div');

  prompt.id = 'music-consent';
  prompt.className = 'music-consent';

  prompt.innerHTML = `
    <div class="music-question">beraber dinleyelim mi?</div>
    <div class="music-options">
      <span class="music-option" data-action="yes">olur</span>
      <span> / </span>
      <span class="music-option" data-action="no">yok ya</span>
    </div>
  `;

  lyrics.insertAdjacentElement('afterend', prompt);
  state.promptShown = true;

  lyricStyles();

  prompt.addEventListener('click', event => {
    const action = event.target?.dataset?.action;
    if (!action) return;

    if (action === 'no') {
      state.choice = 'no';
      prompt.remove();
      return;
    }

    if (!state.yt.ready) {
      return;
    }

    const startMs = progress();
    const startAt = performance.now();

    state.choice = 'yes';
    prompt.remove();

    playYouTube(startMs, startAt);
  });
}

function ytContainer() {
  let el = document.getElementById(
    'youtube-background-player'
  );

  if (el) return el;

  el = document.createElement('div');
  el.id = 'youtube-background-player';
  el.className = 'youtube-background-player';

  document.body.appendChild(el);

  return el;
}

function loadYT() {
  if (window.YT?.Player) {
    return Promise.resolve(window.YT);
  }

  if (state.yt.api) {
    return state.yt.api;
  }

  state.yt.api = new Promise((resolve, reject) => {
    const old = window.onYouTubeIframeAPIReady;

    window.onYouTubeIframeAPIReady = () => {
      try {
        old?.();
      } catch {}

      resolve(window.YT);
    };

    if (
      document.querySelector(
        'script[src="https://www.youtube.com/iframe_api"]'
      )
    ) {
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = reject;

    document.head.appendChild(script);
  });

  return state.yt.api;
}

async function ensureYT() {
  if (state.yt.player && state.yt.ready) {
    return state.yt.player;
  }

  await loadYT();

  if (state.yt.player && state.yt.ready) {
    return state.yt.player;
  }

  return new Promise((resolve, reject) => {
    try {
      state.yt.player = new YT.Player(
        ytContainer(),
        {
          width: '200',
          height: '200',
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            iv_load_policy: 3,
            playsinline: 1,
            rel: 0,
            origin: location.origin
          },
          events: {
            onReady: event => {
              state.yt.ready = true;

              try {
                const iframe = event.target.getIframe();
                iframe.setAttribute('playsinline', '1');
                iframe.setAttribute('allow', 'autoplay');
              } catch {}

              resolve(event.target);
            },

            onStateChange: event => {
              const s = state.yt.sync;

              if (
                event.data === YT.PlayerState.PLAYING &&
                s
              ) {
                const target =
                  s.ms +
                  (performance.now() - s.at);

                s.done = true;
                state.yt.sync = null;

                try {
                  event.target.seekTo(
                    target / 1000,
                    true
                  );
                } catch {}
              }

              if (
                event.data === YT.PlayerState.ENDED
              ) {
                poll(true);
              }
            }
          }
        }
      );
    } catch (e) {
      reject(e);
    }
  });
}

function playYouTube(ms, at) {
  const player = state.yt.player;
  const videoId =
    String(state.track?.videoId || '').trim();

  if (
    !player ||
    !state.yt.ready ||
    !videoId ||
    !state.playing
  ) {
    return;
  }

  state.yt.videoId = videoId;
  state.yt.sync = { ms, at, done: false };

  try {
    player.loadVideoById({
      videoId,
      startSeconds: ms / 1000
    });
  } catch {
    state.yt.sync = null;
  }
}

function stopYouTube() {
  state.yt.sync = null;

  try {
    state.yt.player?.pauseVideo();
  } catch {}
}

async function apply(data, start, end) {
  ensureLyrics();

  if (!data || data.error) {
    state.track = null;
    state.lastTrack = '';
    state.lyrics = null;
    state.lyric = '';
    state.playing = false;

    document.getElementById('music-consent')?.remove();
    stopYouTube();

    const now = document.getElementById('now-playing');
    if (now) {
      now.textContent =
        data?.error ||
        'bir şeyler ters gitti.';
    }

    return;
  }

  const oldTrack = state.lastTrack;
  const oldPlaying = state.playing;

  state.track = data;
  state.playing = !!data.isPlaying;
  state.duration =
    Number(data.durationMs) ||
    seconds(data.duration) * 1000;

  setClock(data, start, end);

  if (data.trackLink !== oldTrack) {
    state.lyricToken++;
    state.lyricAbort?.abort();

    state.lastTrack = data.trackLink;
    state.lyrics = null;
    state.lyric = '';
    state.lyricPending = '';

    stopYouTube();
    state.yt.videoId = '';

    renderTrack();

    const front = document.getElementById('front');
    if (front) front.textContent = 'yükleniyor...';

    if (!state.playing) {
      document.getElementById('music-consent')?.remove();
    } else if (state.choice === null) {
      createPrompt();
    } else if (state.choice === 'yes') {
      playYouTube(progress(), performance.now());
    }

    const token = state.lyricToken;

    getLyrics(data).then(lyrics => {
      if (
        token !== state.lyricToken ||
        !lyrics
      ) {
        return;
      }

      state.lyrics = lyrics;
      render();
    });

    return;
  }

  if (!state.playing) {
    document.getElementById('music-consent')?.remove();
    stopYouTube();
  } else {
    if (
      state.choice === null &&
      !state.promptShown
    ) {
      createPrompt();
    }

    if (
      state.choice === 'yes' &&
      !oldPlaying
    ) {
      playYouTube(
        progress(),
        performance.now()
      );
    }
  }

  render();
}

async function poll(force = false) {
  if (state.pollBusy) {
    state.pollAgain = true;
    return;
  }

  state.pollBusy = true;

  const start = Date.now();

  try {
    await apply(
      await fetchJSON(POLL_URL),
      start,
      Date.now()
    );
  } catch {
    const el = document.getElementById('now-playing');
    if (el) {
      el.textContent =
        'bir şeyler ters gitti.';
    }
  }

  state.pollBusy = false;

  if (state.pollAgain) {
    state.pollAgain = false;
    poll(true);
    return;
  }

  setTimeout(
    () => poll(false),
    force ? 250 : POLL_MS
  );
}

styles();
ensureLyrics();
ensureYT().catch(() => {});
poll(true);

setInterval(render, 100);

document.addEventListener(
  'visibilitychange',
  () => {
    if (!document.hidden) {
      poll(true);
    }
  }
);
