const POLL_URL = 'https://akakadir.vercel.app/api/now-playing';
const TOKEN_URL = 'https://akakadir.vercel.app/api/spotify-token';
const POLL_MS = 1000;

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
  allowed: false,
  sdkReady: false
};

const fetchJSON = (url) =>
  fetch(url, { cache: 'no-store' }).then(async (r) => {
    const data = await r.json();

    if (!r.ok) {
      throw new Error(
        data?.error ||
        data?.spotify_error_description ||
        `HTTP ${r.status}`
      );
    }

    return data;
  });

const parseTimeToSeconds = (t) =>
  t.split(':').map(Number).reduce((m, s) => m * 60 + s);

const formatTime = (ms) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

async function getSpotifyAccessToken() {
  const data = await fetchJSON(TOKEN_URL);

  if (!data?.access_token) {
    throw new Error('access tokenle aramda bi mevzu var galiba.');
  }

  return data.access_token;
}

function initializeSpotifyPlayer() {
  if (!playback.allowed || !playback.sdkReady || playback.player) return;

  playback.player = new window.Spotify.Player({
    name: 'akakadir.art',
    volume: 0.85,
    getOAuthToken: async (callback) => {
      try {
        callback(await getSpotifyAccessToken());
      } catch {
        callback('');
      }
    }
  });

  playback.player.addListener('ready', ({ device_id }) => {
    playback.deviceId = device_id;
  });

  playback.player.addListener('not_ready', ({ device_id }) => {
    if (playback.deviceId === device_id) {
      playback.deviceId = null;
    }
  });

  playback.player.addListener('initialization_error', ({ message }) => {
    console.error(message);
  });

  playback.player.addListener('authentication_error', ({ message }) => {
    console.error(message);
  });

  playback.player.addListener('account_error', ({ message }) => {
    console.error(message);
  });

  playback.player.addListener('playback_error', ({ message }) => {
    console.error(message);
  });

  playback.player.connect().then((success) => {
    if (!success) {
      playback.player = null;
    }
  });
}

window.onSpotifyWebPlaybackSDKReady = () => {
  playback.sdkReady = true;

  if (playback.allowed) {
    initializeSpotifyPlayer();
  }
};

function bindSpotifyInvite() {
  const box = document.getElementById('spotify-invite');
  const yes = document.getElementById('spotify-yes');
  const no = document.getElementById('spotify-no');

  if (!box || !yes || !no) return;

  yes.addEventListener('click', () => {
    box.remove();
    playback.allowed = true;

    if (playback.sdkReady) {
      initializeSpotifyPlayer();

      if (playback.player) {
        playback.player.activateElement().catch(() => {});
      }
    }
  });

  no.addEventListener('click', () => {
    box.remove();
    playback.allowed = false;
  });
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
    return { error: 'podcast liriklerini okuyamam.' };
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

function renderTrackInfo(data) {
  document.getElementById('now-playing').innerHTML =
    `<img src="https://open.spotifycdn.com/cdn/images/error-page-logo.24aca703.svg" style="width:0.9em;height:0.9em;object-fit:contain;vertical-align:-0.12em"> ${data.artists} - <a class="no-favicon" href="${data.trackLink}" target="_blank" rel="noopener noreferrer">${data.name}</a> | <span id="progress-time">0:00</span>/${data.duration}`;
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
      getCurrentLyric(
        state.lyricsData.lines,
        state.progressMs
      ) || '...'
    );
  }
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

  const serverMs =
    data.progressMs ??
    parseTimeToSeconds(data.progress) * 1000;

  state.isPlaying =
    data.isPlaying ?? true;

  state.durationMs =
    data.durationMs ||
    parseTimeToSeconds(data.duration) * 1000;

  state.trackData = data;
  state.progressMs = serverMs;

  if (data.trackLink !== state.lastTrackLink) {
    const token = ++state.lyricsToken;

    Object.assign(state, {
      lastTrackLink: data.trackLink,
      lyricsData: null,
      currentLyricText: '',
      pendingLyricText: null
    });

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
        state.lyricsData = lyrics;
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
  try {
    await applyPayload(
      await fetchJSON(POLL_URL)
    );
  } catch {
    const nowPlaying =
      document.getElementById(
        'now-playing'
      );

    if (nowPlaying) {
      nowPlaying.textContent =
        'bir şeyler ters gitti.';
    }
  }
}

bindSpotifyInvite();

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
