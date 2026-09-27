const POLL_URL = 'https://akakadir.vercel.app/api/now-playing';
const POLL_MS = 5000;

const state = {
  lastTrackLink: '',
  trackData: null,
  lyricsData: null,
  currentLyricText: '',
  pendingLyricText: null,
  progressMs: 0,
  durationMs: 0,
  isPlaying: false,
  progressAnchorMs: 0,
  progressAnchorPerformance: 0,
  lyricsToken: 0,
  lyricsAbort: null,

  musicChoice: null,
  musicPromptShown: false,

  pollInFlight: false,
  pollAgain: false,

  youtube: {
    player: null,
    ready: false,
    videoId: '',
    apiPromise: null,
    calibrate: false
  }
};

const fetchJSON = async (url, options = {}) => {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
};

const parseTimeToSeconds = (value) =>
  String(value || '0:00')
    .split(':')
    .map(Number)
    .reduce((a, b) => a * 60 + b, 0);

const formatTime = (ms) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

function progressNow() {
  if (
    !state.isPlaying ||
    !state.progressAnchorPerformance
  ) {
    return state.progressMs;
  }

  let value =
    state.progressAnchorMs +
    performance.now() -
    state.progressAnchorPerformance;

  return state.durationMs
    ? Math.min(value, state.durationMs)
    : value;
}

function injectStyles() {
  if (document.getElementById('spotify-widget-styles')) return;

  const style = document.createElement('style');
  style.id = 'spotify-widget-styles';
  style.textContent = `
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

  document.head.appendChild(style);
}

function syncMusicStyles() {
  const front = document.getElementById('front');
  if (!front) return;

  let style = document.getElementById(
    'spotify-widget-lyrics-style'
  );

  if (!style) {
    style = document.createElement('style');
    style.id = 'spotify-widget-lyrics-style';
    document.head.appendChild(style);
  }

  const computed = getComputedStyle(front);
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
    .map(
      (p) =>
        `${p}:${computed.getPropertyValue(p)};`
    )
    .join('');

  const size = parseFloat(computed.fontSize);

  style.textContent = `
    .music-consent,
    .music-question,
    .music-options,
    .music-option{
      ${css}
      ${Number.isFinite(size) ? `font-size:${Math.max(1, size * .75)}px;` : ''}
    }
  `;
}

function parseLyrics(text) {
  return [...text.matchAll(
    /\[(\d+):(\d+)(?:\.(\d+))?\](.*)/g
  )]
    .map(([, m, s, f, text]) => ({
      time:
        +m * 60000 +
        +s * 1000 +
        (f ? +`0.${f}` * 1000 : 0),
      text: text.trim()
    }))
    .sort((a, b) => a.time - b.time);
}

function currentLyric(lines, time) {
  let result = null;

  for (const line of lines) {
    if (line.time > time) break;
    result = line.text;
  }

  return result;
}

async function fetchLyrics(data) {
  if (data.type === 'podcast') {
    return { error: 'podcast liriklerini okuyamam.' };
  }

  state.lyricsAbort?.abort();

  const controller = new AbortController();
  state.lyricsAbort = controller;

  const params = new URLSearchParams({
    artist_name: data.artists || '',
    track_name: data.name || '',
    album_name: data.album || '',
    duration: Math.round(
      (data.durationMs ||
        parseTimeToSeconds(data.duration) * 1000) / 1000
    )
  });

  try {
    const response = await fetch(
      `https://lrclib.net/api/get?${params}`,
      { signal: controller.signal }
    );

    if (!response.ok) {
      return {
        error:
          'bu şarkı sözleri, henüz eşzamanlı değil.'
      };
    }

    const result = await response.json();

    if (!result?.syncedLyrics) {
      return {
        error:
          'bu şarkı sözleri, henüz eşzamanlı değil.'
      };
    }

    return {
      lines: parseLyrics(result.syncedLyrics)
    };
  } catch (error) {
    if (error.name === 'AbortError') return null;

    return {
      error:
        'bu şarkı sözleri, henüz eşzamanlı değil.'
    };
  }
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

  syncMusicStyles();
}

function animateLyric(text) {
  if (
    state.currentLyricText === text ||
    state.pendingLyricText === text
  ) {
    return;
  }

  const cube = document.getElementById('cube');
  const front = document.getElementById('front');
  const bottom = document.getElementById('bottom');

  if (!cube || !front || !bottom) return;

  state.pendingLyricText = text;
  bottom.textContent = text;

  cube.classList.add('animate', 'show-next');

  setTimeout(() => {
    cube.classList.remove('animate', 'show-next');
    front.textContent = text;
    state.currentLyricText = text;
    state.pendingLyricText = null;
    syncMusicStyles();
  }, 600);
}

function render() {
  if (!state.trackData) return;

  const time = document.getElementById('progress-time');

  if (time) {
    time.textContent = formatTime(progressNow());
  }

  if (!state.lyricsData) return;

  const front = document.getElementById('front');
  if (!front) return;

  if (state.lyricsData.error) {
    front.textContent = state.lyricsData.error;
    return;
  }

  animateLyric(
    currentLyric(
      state.lyricsData.lines,
      progressNow()
    ) || '...'
  );
}

function showTrack(data) {
  const el = document.getElementById('now-playing');
  if (!el) return;

  el.innerHTML =
    `🎧 ${data.artists} - ` +
    `<a class="no-favicon" href="${data.trackLink}" target="_blank" rel="noopener noreferrer">${data.name}</a>` +
    ` | <span id="progress-time">${formatTime(progressNow())}</span>/${data.duration}`;
}

function setClock(data, start, end) {
  let progress =
    Number(
      data.progressMs ??
      parseTimeToSeconds(data.progress) * 1000
    ) || 0;

  const serverTime = Number(data.serverTime) || 0;

  if (serverTime) {
    const age =
      (start + end) / 2 - serverTime;

    if (age > -1000 && age < 10000) {
      progress += Math.max(0, age);
    }
  }

  if (data.durationMs) {
    progress = Math.min(
      progress,
      Number(data.durationMs)
    );
  }

  state.progressMs = Math.max(0, progress);
  state.progressAnchorMs = state.progressMs;
  state.progressAnchorPerformance = performance.now();
}

function removePrompt() {
  document.getElementById('music-consent')?.remove();
}

function createPrompt() {
  if (
    state.musicChoice !== null ||
    state.musicPromptShown
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
  state.musicPromptShown = true;

  syncMusicStyles();

  prompt.addEventListener('click', async (event) => {
    const action = event.target?.dataset?.action;
    if (!action) return;

    if (action === 'no') {
      state.musicChoice = 'no';
      prompt.remove();
      return;
    }

    const clickedAt = performance.now();
    const clickedProgress = progressNow();
    const button = prompt.querySelector('[data-action="yes"]');

    if (!state.youtube.player || !state.youtube.ready) {
      button?.classList.add('disabled');

      try {
        await ensureYouTube();
      } catch {
        button?.classList.remove('disabled');
        return;
      }

      button?.classList.remove('disabled');
    }

    if (
      !state.isPlaying ||
      !state.trackData?.videoId
    ) {
      return;
    }

    state.musicChoice = 'yes';
    prompt.remove();

    const target =
      clickedProgress +
      (performance.now() - clickedAt);

    playYouTube(target);
  });
}

function createYouTubeContainer() {
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

function loadYouTubeAPI() {
  if (window.YT?.Player) {
    return Promise.resolve(window.YT);
  }

  if (state.youtube.apiPromise) {
    return state.youtube.apiPromise;
  }

  state.youtube.apiPromise = new Promise(
    (resolve, reject) => {
      const previous =
        window.onYouTubeIframeAPIReady;

      window.onYouTubeIframeAPIReady = () => {
        try {
          previous?.();
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
    }
  );

  return state.youtube.apiPromise;
}

async function ensureYouTube() {
  if (
    state.youtube.player &&
    state.youtube.ready
  ) {
    return state.youtube.player;
  }

  await loadYouTubeAPI();

  if (
    state.youtube.player &&
    state.youtube.ready
  ) {
    return state.youtube.player;
  }

  return new Promise((resolve, reject) => {
    try {
      state.youtube.player = new YT.Player(
        createYouTubeContainer(),
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
            onReady: (event) => {
              state.youtube.ready = true;

              try {
                const iframe =
                  event.target.getIframe();

                iframe.setAttribute(
                  'playsinline',
                  '1'
                );

                iframe.setAttribute(
                  'allow',
                  'autoplay'
                );
              } catch {}

              resolve(event.target);
            },

            onStateChange: (event) => {
              if (
                event.data ===
                YT.PlayerState.PLAYING
              ) {
                if (state.youtube.calibrate) {
                  state.youtube.calibrate = false;

                  try {
                    event.target.seekTo(
                      progressNow() / 1000,
                      true
                    );
                  } catch {}
                }
              }

              if (
                event.data ===
                YT.PlayerState.ENDED
              ) {
                pollTrack(true);
              }
            }
          }
        }
      );
    } catch (error) {
      reject(error);
    }
  });
}

function playYouTube(startMs) {
  const player = state.youtube.player;
  const videoId =
    String(state.trackData?.videoId || '').trim();

  if (
    !player ||
    !state.youtube.ready ||
    !videoId ||
    !state.isPlaying
  ) {
    return;
  }

  state.youtube.videoId = videoId;
  state.youtube.calibrate = true;

  try {
    player.loadVideoById({
      videoId,
      startSeconds: Math.max(0, startMs) / 1000
    });
  } catch {
    state.youtube.calibrate = false;
  }
}

function stopYouTube() {
  state.youtube.calibrate = false;

  try {
    state.youtube.player?.pauseVideo();
  } catch {}
}

async function applyPayload(data, start, end) {
  ensureLyrics();

  if (!data || data.error) {
    state.trackData = null;
    state.lastTrackLink = '';
    state.lyricsData = null;
    state.currentLyricText = '';
    state.pendingLyricText = null;
    state.isPlaying = false;

    removePrompt();
    stopYouTube();

    const now = document.getElementById('now-playing');
    if (now) {
      now.textContent =
        data?.error ||
        'bir şeyler ters gitti.';
    }

    const front = document.getElementById('front');
    if (front) front.textContent = '';

    return;
  }

  const previousTrack =
    state.lastTrackLink;

  const previousPlaying =
    state.isPlaying;

  state.trackData = data;
  state.isPlaying = Boolean(data.isPlaying);
  state.durationMs =
    Number(data.durationMs) ||
    parseTimeToSeconds(data.duration) * 1000;

  setClock(data, start, end);

  if (data.trackLink !== previousTrack) {
    state.lyricsToken++;
    state.lyricsAbort?.abort();

    state.lastTrackLink = data.trackLink;
    state.lyricsData = null;
    state.currentLyricText = '';
    state.pendingLyricText = null;

    stopYouTube();
    state.youtube.videoId = '';

    showTrack(data);

    const front = document.getElementById('front');
    const bottom = document.getElementById('bottom');

    if (front) front.textContent = 'yükleniyor...';
    if (bottom) bottom.textContent = '';

    if (!state.isPlaying) {
      removePrompt();
    } else if (
      state.musicChoice === null
    ) {
      createPrompt();
    } else if (
      state.musicChoice === 'yes' &&
      data.videoId
    ) {
      playYouTube(progressNow());
    }

    const token = state.lyricsToken;

    fetchLyrics(data).then((lyrics) => {
      if (
        token !== state.lyricsToken ||
        !lyrics
      ) {
        return;
      }

      state.lyricsData = lyrics;
      render();
    });

    return;
  }

  if (!state.isPlaying) {
    removePrompt();
    stopYouTube();
  } else {
    if (
      state.musicChoice === null &&
      !state.musicPromptShown
    ) {
      createPrompt();
    }

    if (
      state.musicChoice === 'yes' &&
      !previousPlaying
    ) {
      playYouTube(progressNow());
    }
  }

  render();
}

async function pollTrack(force = false) {
  if (state.pollInFlight) {
    state.pollAgain = true;
    return;
  }

  state.pollInFlight = true;

  const start = Date.now();

  try {
    const data =
      await fetchJSON(POLL_URL);

    await applyPayload(
      data,
      start,
      Date.now()
    );
  } catch {
    const now =
      document.getElementById(
        'now-playing'
      );

    if (now) {
      now.textContent =
        'bir şeyler ters gitti.';
    }
  }

  state.pollInFlight = false;

  if (state.pollAgain) {
    state.pollAgain = false;
    pollTrack(true);
    return;
  }

  setTimeout(
    () => pollTrack(false),
    force ? 250 : POLL_MS
  );
}

injectStyles();
ensureLyrics();
ensureYouTube().catch(() => {});
pollTrack(true);

setInterval(render, 100);

document.addEventListener(
  'visibilitychange',
  () => {
    if (!document.hidden) {
      pollTrack(true);
    }
  }
);
