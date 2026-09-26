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

const player = {
  instance: null,
  deviceId: null
};

function fetchJSON(url) {
  return fetch(url, { cache: 'no-store' }).then((response) =>
    response.json()
  );
}

function parseTimeToSeconds(time) {
  return time
    .split(':')
    .map(Number)
    .reduce((m, s) => m * 60 + s);
}

function formatTime(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
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

  return found;
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
      (data.durationMs || parseTimeToSeconds(data.duration) * 1000) / 1000
    )
  });

  try {
    const response = await fetch(
      `https://lrclib.net/api/get?${params}`,
      { cache: 'no-store' }
    );

    const result = await response.json();

    if (result?.syncedLyrics) {
      return {
        type: 'synced',
        lines: parseSyncedLyrics(result.syncedLyrics)
      };
    }

    return {
      error: 'bu şarkı sözleri, henüz eş zamanlı değil.'
    };
  } catch {
    return {
      error: 'şarkı sözleri alınamadı.'
    };
  }
}

function ensureCube() {
  const lyrics = document.getElementById('lyrics');

  if (lyrics && !document.getElementById('cube')) {
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

  container.innerHTML =
    `<img src="https://open.spotifycdn.com/cdn/images/error-page-logo.24aca703.svg" style="width:0.9em;height:0.9em;object-fit:contain;vertical-align:-0.12em"> ${data.artists} - <a class="no-favicon" href="${data.trackLink}" target="_blank" rel="noopener noreferrer">${data.name}</a> | <span id="progress-time">${formatTime(state.progressMs)}</span>/${data.duration}`;
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

  if (state.isPlaying && state.trackData) {
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

  state.progressMs =
    data.progressMs ??
    parseTimeToSeconds(data.progress) * 1000;

  state.durationMs =
    data.durationMs ||
    parseTimeToSeconds(data.duration) * 1000;

  state.isPlaying = Boolean(data.isPlaying);
  state.trackData = data;

  if (data.trackLink !== state.lastTrackLink) {
    const token = ++state.lyricsToken;

    state.lastTrackLink = data.trackLink;
    state.lyricsData = null;
    state.currentLyricText = '';
    state.pendingLyricText = null;

    renderTrackInfo(data);

    const front = document.getElementById('front');
    const bottom = document.getElementById('bottom');

    if (front) {
      front.textContent = 'yükleniyor...';
    }

    if (bottom) {
      bottom.textContent = '';
    }

    const lyrics = await fetchLyrics(data);

    if (token === state.lyricsToken) {
      state.lyricsData = lyrics;
    }
  }

  render();
}

function schedulePoll(delay) {
  clearTimeout(state.pollTimer);
  state.pollTimer = setTimeout(pollTrack, delay);
}

async function pollTrack() {
  if (document.visibilityState === 'hidden') return;

  try {
    await applyPayload(await fetchJSON(POLL_URL));
  } catch {
    const nowPlaying = document.getElementById('now-playing');

    if (nowPlaying) {
      nowPlaying.textContent = 'bir şeyler ters gitti.';
    }
  }

  schedulePoll(
    state.isPlaying
      ? ACTIVE_POLL_MS
      : IDLE_POLL_MS
  );
}

async function getSpotifyAccessToken() {
  const response = await fetch(TOKEN_URL, {
    cache: 'no-store'
  });

  const data = await response.json();

  if (!response.ok || !data?.access_token) {
    throw new Error('Spotify access token alınamadı.');
  }

  return data.access_token;
}

function initSpotifyPlayer() {
  if (!window.Spotify || player.instance) return;

  player.instance = new window.Spotify.Player({
    name: 'akakadir.art',
    volume: 1,
    getOAuthToken: async (callback) => {
      try {
        callback(await getSpotifyAccessToken());
      } catch {
        callback('');
      }
    }
  });

  player.instance.addListener('ready', ({ device_id }) => {
    player.deviceId = device_id;
  });

  player.instance.addListener('not_ready', ({ device_id }) => {
    if (player.deviceId === device_id) {
      player.deviceId = null;
    }
  });

  player.instance.addListener(
    'initialization_error',
    ({ message }) => {
      console.error('Spotify:', message);
    }
  );

  player.instance.addListener(
    'authentication_error',
    ({ message }) => {
      console.error('Spotify:', message);
    }
  );

  player.instance.addListener(
    'account_error',
    ({ message }) => {
      console.error('Spotify:', message);
    }
  );

  player.instance.addListener(
    'playback_error',
    ({ message }) => {
      console.error('Spotify:', message);
    }
  );

  player.instance.connect();
}

function setupSpotifyInvite() {
  const invite = document.getElementById('spotify-invite');
  const yes = document.getElementById('spotify-yes');
  const no = document.getElementById('spotify-no');

  if (!invite || !yes || !no) return;

  yes.addEventListener('click', () => {
    invite.remove();

    if (!window.Spotify) return;

    initSpotifyPlayer();

    player.instance?.activateElement().catch(() => {});
  });

  no.addEventListener('click', () => {
    invite.remove();
  });
}

window.onSpotifyWebPlaybackSDKReady = () => {};

document.addEventListener('DOMContentLoaded', () => {
  ensureCube();
  setupSpotifyInvite();

  state.lastTickAt = performance.now();

  pollTrack();

  setInterval(tick, 100);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;

    state.lastTickAt = performance.now();
    pollTrack();
  });
});
