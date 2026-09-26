const POLL_URL = 'https://akakadir.vercel.app/api/now-playing';
const TOKEN_URL = 'https://akakadir.vercel.app/api/spotify-token';
const POLL_MS = 5000;
const SYNC_TOLERANCE_MS = 1500;

const state = {
  lastTrackLink: '',
  lyricsData: null,
  currentLyricText: '',
  pendingLyricText: null,
  trackData: null,
  progressMs: 0,
  durationMs: 0,
  isPlaying: false,
  lastTickAt: performance.now(),
  lyricsToken: 0
};

const playback = {
  player: null,
  deviceId: null,
  readyPromise: null,
  readyResolve: null,
  readyReject: null,
  isPlaying: false,
  initialized: false,
  transferInProgress: false
};

const fetchJSON = (url, options = {}) =>
  fetch(url, {
    cache: 'no-store',
    ...options
  }).then(async (response) => {
    let data = null;

    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      const message =
        data?.error ||
        data?.spotify_error_description ||
        `HTTP ${response.status}`;

      throw new Error(message);
    }

    return data;
  });

const parseTimeToSeconds = (t) =>
  t.split(':').map(Number).reduce((m, s) => m * 60 + s);

const formatTime = (ms) => {
  const total = Math.max(0, Math.floor(ms / 1000));

  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

const wait = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

async function getSpotifyAccessToken() {
  const data = await fetchJSON(TOKEN_URL);

  if (!data?.access_token) {
    throw new Error('Spotify access token alınamadı.');
  }

  return data.access_token;
}

function getPlayButton() {
  return document.getElementById('spotify-play-button');
}

function setPlayButton(mode, disabled = false) {
  const button = getPlayButton();

  if (!button) return;

  button.disabled = disabled;

  if (mode === 'loading') {
    button.textContent = '…';
    button.setAttribute('aria-label', 'Spotify hazırlanıyor');
    button.title = 'Spotify hazırlanıyor';
    return;
  }

  if (mode === 'pause') {
    button.textContent = '❚❚';
    button.setAttribute('aria-label', 'Spotify oynatmayı duraklat');
    button.title = 'Duraklat';
    return;
  }

  button.textContent = '▶';
  button.setAttribute('aria-label', 'Spotify şarkıyı oynat');
  button.title = 'Oynat';
}

function ensurePlayButton() {
  const button = getPlayButton();

  if (!button || button.dataset.bound === '1') return;

  button.dataset.bound = '1';

  button.addEventListener('click', async () => {
    await toggleSpotifyPlayback();
  });
}

function renderTrackInfo(data) {
  document.getElementById('now-playing').innerHTML = `
    <img
      src="https://open.spotifycdn.com/cdn/images/error-page-logo.24aca703.svg"
      style="width:0.9em;height:0.9em;object-fit:contain;vertical-align:-0.12em"
      alt="Spotify"
    >

    <button
      id="spotify-play-button"
      type="button"
      style="
        display:inline-flex;
        align-items:center;
        justify-content:center;
        width:1.8em;
        height:1.8em;
        margin:0 0.35em;
        padding:0;
        border:0;
        border-radius:50%;
        background:transparent;
        color:inherit;
        font:inherit;
        line-height:1;
        cursor:pointer;
        vertical-align:-0.22em;
      "
      aria-label="Spotify şarkıyı oynat"
      title="Oynat"
    >▶</button>

    ${data.artists} -
    <a
      class="no-favicon"
      href="${data.trackLink}"
      target="_blank"
      rel="noopener noreferrer"
    >${data.name}</a>
    |
    <span id="progress-time">0:00</span>/${data.duration}
  `;

  ensurePlayButton();

  if (playback.isPlaying) {
    setPlayButton('pause');
  } else {
    setPlayButton('play');
  }
}

function render() {
  if (!state.trackData) return;

  const timeEl = document.getElementById('progress-time');

  if (timeEl) {
    timeEl.textContent = formatTime(state.progressMs);
  }

  if (!state.lyricsData) return;

  if (state.lyricsData.error) {
    const front = document.getElementById('front');

    if (front) {
      front.textContent = state.lyricsData.error;
    }
  } else {
    triggerCubeAnimation(
      getCurrentLyric(state.lyricsData.lines, state.progressMs) || '...'
    );
  }
}

function parseSyncedLyrics(synced) {
  return [...synced.matchAll(/\[(\d+):(\d+)(?:\.(\d+))?\](.*)/g)]
    .map(([, m, s, frac, text]) => ({
      time:
        Number(m) * 60000 +
        Number(s) * 1000 +
        (frac ? Number(`0.${frac}`) * 1000 : 0),
      text: text.trim()
    }))
    .sort((a, b) => a.time - b.time);
}

function getCurrentLyric(lines, currentMs) {
  let found = null;

  for (const line of lines) {
    if (line.time > currentMs) break;
    found = line.text;
  }

  return found || null;
}

async function fetchLyrics({
  type,
  duration,
  durationMs,
  artists,
  name,
  album
}) {
  if (type === 'podcast') {
    return {
      error: 'podcast liriklerini okuyamam.'
    };
  }

  const params = new URLSearchParams({
    artist_name: artists,
    track_name: name,
    album_name: album,
    duration: Math.round(
      (durationMs || parseTimeToSeconds(duration) * 1000) / 1000
    )
  });

  const { syncedLyrics } = await fetchJSON(
    `https://lrclib.net/api/get?${params}`
  );

  return syncedLyrics
    ? {
        lines: parseSyncedLyrics(syncedLyrics),
        type: 'synced'
      }
    : {
        error: 'bu şarkı sözleri, henüz eş zamanlı değil.'
      };
}

function ensureCube() {
  const lyricsDiv = document.getElementById('lyrics');

  if (
    lyricsDiv &&
    !document.getElementById('cube')
  ) {
    lyricsDiv.innerHTML = `
      <div class="cube" id="cube">
        <div class="side-front" id="front"></div>
        <div class="side-bottom" id="bottom"></div>
      </div>
    `;
  }
}

function triggerCubeAnimation(newText) {
  if (
    state.currentLyricText === newText ||
    state.pendingLyricText === newText
  ) {
    return;
  }

  const cube = document.getElementById('cube');
  const front = document.getElementById('front');
  const bottom = document.getElementById('bottom');

  if (!cube) return;

  state.pendingLyricText = newText;
  bottom.textContent = newText;

  cube.classList.add('animate', 'show-next');

  setTimeout(() => {
    cube.classList.remove('animate', 'show-next');

    front.textContent = newText;
    state.currentLyricText = newText;
    state.pendingLyricText = null;
  }, 600);
}

function tick() {
  const now = performance.now();
  const delta = now - state.lastTickAt;

  state.lastTickAt = now;

  if (
    state.isPlaying &&
    state.trackData
  ) {
    state.progressMs += delta;

    if (
      state.durationMs &&
      state.progressMs > state.durationMs
    ) {
      state.progressMs = state.durationMs;
    }
  }

  render();
}

async function applyPayload(data) {
  ensureCube();

  if (!data || data.error) {
    Object.assign(state, {
      trackData: null,
      lastTrackLink: '',
      lyricsData: null,
      currentLyricText: '',
      pendingLyricText: null,
      isPlaying: false
    });

    const nowPlaying = document.getElementById('now-playing');

    if (nowPlaying) {
      nowPlaying.textContent =
        data?.error || 'bir şeyler ters gitti.';
    }

    const front = document.getElementById('front');

    if (front) {
      front.textContent = '';
    }

    return;
  }

  const serverMs =
    data.progressMs ??
    parseTimeToSeconds(data.progress) * 1000;

  state.isPlaying =
    data.isPlaying ?? true;

  state.durationMs =
    data.durationMs ||
    parseTimeToSeconds(data.duration) * 1000;

  state.trackData = data;

  if (data.trackLink !== state.lastTrackLink) {
    const token = ++state.lyricsToken;

    Object.assign(state, {
      lastTrackLink: data.trackLink,
      lyricsData: null,
      currentLyricText: '',
      pendingLyricText: null,
      progressMs: serverMs
    });

    renderTrackInfo(data);

    const front = document.getElementById('front');
    const bottom = document.getElementById('bottom');

    if (front) {
      front.textContent = 'yükleniyor...';
    }

    if (bottom) {
      bottom.textContent = '';
    }

    try {
      const lyrics = await fetchLyrics(data);

      if (token === state.lyricsToken) {
        state.lyricsData = lyrics;
      }
    } catch {
      if (token === state.lyricsToken) {
        state.lyricsData = {
          error: 'sözleri getiremedim.'
        };
      }
    }
  } else if (
    Math.abs(serverMs - state.progressMs) >
    SYNC_TOLERANCE_MS
  ) {
    state.progressMs = serverMs;
  }

  render();

  if (playback.player && !playback.transferInProgress) {
    setPlayButton(
      playback.isPlaying ? 'pause' : 'play'
    );
  }
}

async function pollTrack() {
  try {
    await applyPayload(
      await fetchJSON(POLL_URL)
    );
  } catch {
    const nowPlaying =
      document.getElementById('now-playing');

    if (nowPlaying) {
      nowPlaying.textContent =
        'bir şeyler ters gitti.';
    }
  }
}

function initializeSpotifyPlayer() {
  if (
    playback.initialized ||
    !window.Spotify
  ) {
    return playback.readyPromise;
  }

  playback.initialized = true;

  playback.readyPromise = new Promise(
    (resolve, reject) => {
      playback.readyResolve = resolve;
      playback.readyReject = reject;

      const player = new window.Spotify.Player({
        name: 'akakadir.art',
        volume: 0.85,

        getOAuthToken: async (callback) => {
          try {
            const token =
              await getSpotifyAccessToken();

            callback(token);
          } catch (error) {
            console.error(
              'Spotify token error:',
              error
            );

            callback('');
          }
        }
      });

      playback.player = player;

      player.addListener(
        'ready',
        ({ device_id }) => {
          playback.deviceId = device_id;

          if (playback.readyResolve) {
            playback.readyResolve(device_id);
          }

          playback.readyResolve = null;
          playback.readyReject = null;

          setPlayButton(
            playback.isPlaying ? 'pause' : 'play'
          );
        }
      );

      player.addListener(
        'not_ready',
        ({ device_id }) => {
          if (
            playback.deviceId === device_id
          ) {
            playback.deviceId = null;
          }
        }
      );

      player.addListener(
        'player_state_changed',
        (sdkState) => {
          if (!sdkState) return;

          playback.isPlaying =
            !sdkState.paused;

          setPlayButton(
            playback.isPlaying
              ? 'pause'
              : 'play'
          );
        }
      );

      player.addListener(
        'initialization_error',
        ({ message }) => {
          console.error(
            'Spotify initialization error:',
            message
          );

          if (playback.readyReject) {
            playback.readyReject(
              new Error(message)
            );
          }

          playback.readyResolve = null;
          playback.readyReject = null;
        }
      );

      player.addListener(
        'authentication_error',
        ({ message }) => {
          console.error(
            'Spotify authentication error:',
            message
          );

          if (playback.readyReject) {
            playback.readyReject(
              new Error(message)
            );
          }

          playback.readyResolve = null;
          playback.readyReject = null;
        }
      );

      player.addListener(
        'account_error',
        ({ message }) => {
          console.error(
            'Spotify account error:',
            message
          );

          if (playback.readyReject) {
            playback.readyReject(
              new Error(message)
            );
          }

          playback.readyResolve = null;
          playback.readyReject = null;
        }
      );

      player.addListener(
        'playback_error',
        ({ message }) => {
          console.error(
            'Spotify playback error:',
            message
          );
        }
      );

      player.connect().then((success) => {
        if (!success) {
          const error =
            new Error(
              'Spotify player bağlanamadı.'
            );

          if (playback.readyReject) {
            playback.readyReject(error);
          }

          playback.readyResolve = null;
          playback.readyReject = null;
        }
      });
    }
  );

  return playback.readyPromise;
}

window.onSpotifyWebPlaybackSDKReady = () => {
  initializeSpotifyPlayer();
};

async function waitForPlayerState(timeoutMs = 5000) {
  const startedAt = performance.now();

  while (
    performance.now() - startedAt <
    timeoutMs
  ) {
    const currentState =
      await playback.player.getCurrentState();

    if (currentState) {
      return currentState;
    }

    await wait(250);
  }

  return null;
}

async function transferPlaybackToBrowser() {
  if (!playback.deviceId) {
    throw new Error(
      'Spotify browser cihazı hazır değil.'
    );
  }

  const token =
    await getSpotifyAccessToken();

  const response = await fetch(
    'https://api.spotify.com/v1/me/player',
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        device_ids: [
          playback.deviceId
        ],
        play: false
      })
    }
  );

  if (!response.ok) {
    let errorData = null;

    try {
      errorData = await response.json();
    } catch {
      errorData = null;
    }

    throw new Error(
      errorData?.error?.message ||
      `Spotify playback transfer başarısız: HTTP ${response.status}`
    );
  }
}

async function startCurrentTrack() {
  if (!state.trackData) {
    throw new Error(
      'Şu anda oynatılabilecek bir Spotify şarkısı yok.'
    );
  }

  if (
    !playback.player ||
    !playback.deviceId
  ) {
    await initializeSpotifyPlayer();
  }

  /*
   * Kullanıcı tıklaması sırasında çağırıyoruz.
   * Browser autoplay politikasını aşmak için gerekli.
   */
  await playback.player.activateElement();

  playback.transferInProgress = true;
  setPlayButton('loading', true);

  try {
    await transferPlaybackToBrowser();

    const sdkState =
      await waitForPlayerState(5000);

    if (!sdkState) {
      throw new Error(
        'Spotify şarkı durumu browser playerına gelmedi.'
      );
    }

    let positionMs = Math.max(
      0,
      Math.floor(state.progressMs || 0)
    );

    if (state.durationMs) {
      positionMs = Math.min(
        positionMs,
        Math.max(0, state.durationMs - 500)
      );
    }

    await playback.player.seek(positionMs);
    await playback.player.resume();

    playback.isPlaying = true;

    setPlayButton('pause');
  } finally {
    playback.transferInProgress = false;

    setPlayButton(
      playback.isPlaying
        ? 'pause'
        : 'play'
    );
  }
}

async function toggleSpotifyPlayback() {
  ensurePlayButton();

  if (playback.transferInProgress) {
    return;
  }

  const button = getPlayButton();

  if (button) {
    button.disabled = true;
  }

  try {
    if (!playback.player) {
      setPlayButton('loading', true);

      await initializeSpotifyPlayer();

      await wait(100);
    }

    if (playback.isPlaying) {
      await playback.player.pause();

      playback.isPlaying = false;
      setPlayButton('play');

      return;
    }

    await startCurrentTrack();
  } catch (error) {
    console.error(
      'Spotify playback error:',
      error
    );

    setPlayButton('play');

    if (button) {
      button.title =
        error?.message ||
        'Spotify oynatılamadı.';
    }
  } finally {
    const currentButton =
      getPlayButton();

    if (currentButton) {
      currentButton.disabled = false;
    }
  }
}

state.lastTickAt = performance.now();

pollTrack();

setInterval(
  pollTrack,
  POLL_MS
);

setInterval(
  tick,
  100
);

document.addEventListener(
  'visibilitychange',
  () => {
    if (document.hidden) return;

    state.lastTickAt =
      performance.now();

    pollTrack();
  }
);
