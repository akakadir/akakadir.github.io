const POLL_URL = 'https://akakadir.vercel.app/api/now-playing';
const TOKEN_URL = 'https://akakadir.vercel.app/api/spotify-token';
const ACTIVE_POLL_MS = 1000;
const IDLE_POLL_MS = 15000;

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
  lyricsToken: 0,
  pollTimer: null
};

const playerState = {
  player: null,
  deviceId: null,
  ready: false
};

function fetchJSON(url) {
  return fetch(url, { cache: 'no-store' }).then(async (response) => {
    if (response.status === 204) return null;

    let data = null;

    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      throw new Error(
        data?.error ||
        data?.spotify_error_description ||
        `HTTP ${response.status}`
      );
    }

    return data;
  });
}

function parseTimeToSeconds(value) {
  return value
    .split(':')
    .map(Number)
    .reduce((minutes, seconds) => minutes * 60 + seconds);
}

function formatTime(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function parseSyncedLyrics(synced) {
  return [...synced.matchAll(/\[(\d+):(\d+)(?:\.(\d+))?\](.*)/g)]
    .map(([, minutes, seconds, fraction, text]) => ({
      time:
        Number(minutes) * 60000 +
        Number(seconds) * 1000 +
        (fraction ? Number(`0.${fraction}`) * 1000 : 0),
      text: text.trim()
    }))
    .sort((a, b) => a.time - b.time);
}

function getCurrentLyric(lines, currentMs) {
  let lyric = null;

  for (const line of lines) {
    if (line.time > currentMs) break;
    lyric = line.text;
  }

  return lyric;
}

async function fetchLyrics(data) {
  if (data.type === 'podcast') {
    return { error: 'podcast liriklerini okuyamam.' };
  }

  const params = new URLSearchParams({
    artist_name: data.artists,
    track_name: data.name,
    album_name: data.album,
    duration: Math.round(
      (data.durationMs ||
        parseTimeToSeconds(data.duration) * 1000) / 1000
    )
  });

  const result = await fetchJSON(
    `https://lrclib.net/api/get?${params}`
  );

  return result?.syncedLyrics
    ? {
        type: 'synced',
        lines: parseSyncedLyrics(result.syncedLyrics)
      }
    : {
        error: 'bu şarkı sözleri, henüz eş zamanlı değil.'
      };
}

function ensureCube() {
  const lyrics = document.getElementById('lyrics');

  if (
    lyrics &&
    !document.getElementById('cube')
  ) {
    lyrics.innerHTML = `
      <div class="cube" id="cube">
        <div class="side-front" id="front"></div>
        <div class="side-bottom" id="bottom"></div>
      </div>
    `;
  }
}

function triggerCubeAnimation(text) {
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
  }, 600);
}

function renderTrackInfo(data) {
  const container = document.getElementById('now-playing');

  if (!container) return;

  container.textContent = '';

  const logo = document.createElement('img');
  logo.src =
    'https://open.spotifycdn.com/cdn/images/error-page-logo.24aca703.svg';
  logo.alt = 'Spotify';
  logo.style.cssText =
    'width:0.9em;height:0.9em;object-fit:contain;vertical-align:-0.12em';

  const artist = document.createTextNode(
    ` ${data.artists} - `
  );

  const link = document.createElement('a');
  link.className = 'no-favicon';
  link.href = data.trackLink || '#';
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = data.name;

  const separator = document.createTextNode(' | ');

  const progress = document.createElement('span');
  progress.id = 'progress-time';
  progress.textContent = '0:00';

  container.append(
    logo,
    artist,
    link,
    separator,
    progress,
    document.createTextNode(`/${data.duration}`)
  );
}

function render() {
  if (!state.trackData) return;

  const progress = document.getElementById('progress-time');

  if (progress) {
    progress.textContent = formatTime(state.progressMs);
  }

  if (!state.lyricsData) return;

  const front = document.getElementById('front');

  if (!front) return;

  if (state.lyricsData.error) {
    front.textContent = state.lyricsData.error;
    return;
  }

  triggerCubeAnimation(
    getCurrentLyric(
      state.lyricsData.lines,
      state.progressMs
    ) || '...'
  );
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
      state.progressMs >= state.durationMs
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
      progressMs: 0,
      durationMs: 0,
      isPlaying: false
    });

    const nowPlaying =
      document.getElementById('now-playing');

    if (nowPlaying) {
      nowPlaying.textContent =
        data?.error ||
        'bir şeyler ters gitti.';
    }

    const front =
      document.getElementById('front');

    if (front) {
      front.textContent = '';
    }

    return;
  }

  const progressMs =
    data.progressMs ??
    parseTimeToSeconds(data.progress) * 1000;

  state.progressMs = progressMs;
  state.durationMs =
    data.durationMs ||
    parseTimeToSeconds(data.duration) * 1000;
  state.isPlaying =
    Boolean(data.isPlaying);
  state.trackData = data;

  if (
    data.trackLink !== state.lastTrackLink
  ) {
    const token =
      ++state.lyricsToken;

    state.lastTrackLink =
      data.trackLink;
    state.lyricsData = null;
    state.currentLyricText = '';
    state.pendingLyricText = null;

    renderTrackInfo(data);

    const front =
      document.getElementById('front');

    const bottom =
      document.getElementById('bottom');

    if (front) {
      front.textContent =
        'yükleniyor...';
    }

    if (bottom) {
      bottom.textContent = '';
    }

    try {
      const lyrics =
        await fetchLyrics(data);

      if (
        token === state.lyricsToken
      ) {
        state.lyricsData =
          lyrics;
      }
    } catch {
      if (
        token === state.lyricsToken
      ) {
        state.lyricsData = {
          error:
            'sözleri getiremedim.'
        };
      }
    }
  }

  render();
}

async function pollTrack() {
  if (
    document.visibilityState === 'hidden'
  ) {
    return;
  }

  try {
    const data =
      await fetchJSON(POLL_URL);

    await applyPayload(data);
  } catch {
    const nowPlaying =
      document.getElementById(
        'now-playing'
      );

    if (nowPlaying) {
      nowPlaying.textContent =
        'bir şeyler ters gitti.';
    }
  } finally {
    schedulePoll(
      state.isPlaying
        ? ACTIVE_POLL_MS
        : IDLE_POLL_MS
    );
  }
}

function schedulePoll(delay) {
  clearTimeout(state.pollTimer);

  state.pollTimer =
    setTimeout(
      pollTrack,
      delay
    );
}

async function getSpotifyAccessToken() {
  const data =
    await fetchJSON(TOKEN_URL);

  if (!data?.access_token) {
    throw new Error(
      'Spotify access token alınamadı.'
    );
  }

  return data.access_token;
}

function initSpotifyPlayer() {
  if (
    !window.Spotify ||
    playerState.player
  ) {
    return;
  }

  const player =
    new window.Spotify.Player({
      name: 'akakadir.art',
      volume: 1,
      getOAuthToken: async (callback) => {
        try {
          callback(
            await getSpotifyAccessToken()
          );
        } catch {
          callback('');
        }
      }
    });

  playerState.player =
    player;

  player.addListener(
    'ready',
    ({ device_id }) => {
      playerState.deviceId =
        device_id;
      playerState.ready = true;
    }
  );

  player.addListener(
    'not_ready',
    ({ device_id }) => {
      if (
        playerState.deviceId ===
        device_id
      ) {
        playerState.deviceId =
          null;
        playerState.ready =
          false;
      }
    }
  );

  player.addListener(
    'player_state_changed',
    (playbackState) => {
      if (!playbackState) return;

      state.isPlaying =
        !playbackState.paused;

      if (playbackState.track_window?.current_track) {
        schedulePoll(0);
      }
    }
  );

  player.addListener(
    'initialization_error',
    ({ message }) => {
      console.error(message);
    }
  );

  player.addListener(
    'authentication_error',
    ({ message }) => {
      console.error(message);
    }
  );

  player.addListener(
    'account_error',
    ({ message }) => {
      console.error(message);
    }
  );

  player.addListener(
    'playback_error',
    ({ message }) => {
      console.error(message);
    }
  );

  player.connect();
}

window.onSpotifyWebPlaybackSDKReady = () => {
  initSpotifyPlayer();
};

document.addEventListener(
  'pointerdown',
  () => {
    if (!playerState.player) return;

    playerState.player
      .activateElement()
      .catch(() => {});
  },
  {
    once: true,
    passive: true
  }
);

document.addEventListener(
  'visibilitychange',
  () => {
    clearTimeout(state.pollTimer);

    if (
      document.visibilityState ===
      'visible'
    ) {
      state.lastTickAt =
        performance.now();

      pollTrack();
    }
  }
);

ensureCube();

state.lastTickAt =
  performance.now();

pollTrack();

setInterval(
  tick,
  100
);
