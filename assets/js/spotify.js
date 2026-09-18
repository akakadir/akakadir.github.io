const state = {
  lastTrackLink: '',
  lyricsData: null,
  currentLyricText: '',
  progressMs: 0,
  durationMs: 0,
  timestamp: 0,
  isPlaying: false,
  syncTimer: null,
  fallbackTimer: null,
  fetching: false
};

const parseTimeToSeconds = (t) => t.split(':').map(Number).reduce((m, s) => m * 60 + s);
const fetchJSON = (url) => fetch(url, { cache: 'no-store' }).then((r) => r.json());

function getCurrentLyric(syncedLyrics, currentTime) {
  return [...syncedLyrics.matchAll(/\[(\d+):(\d+)\.\d+\](.*)/g)]
    .filter(([, m, s]) => parseInt(m) * 60 + parseInt(s) <= currentTime)
    .at(-1)?.[3]?.trim() ?? null;
}

async function fetchLyrics({ type, duration, artists, name, album }) {
  if (type === 'podcast') return { error: 'podcast liriklerini okuyamam.' };

  const params = new URLSearchParams({
    artist_name: artists,
    track_name: name,
    album_name: album,
    duration: Math.round(parseTimeToSeconds(duration))
  });

  const { syncedLyrics } = await fetchJSON(`https://lrclib.net/api/get?${params}`);
  return syncedLyrics ? { syncedLyrics, type: 'synced' } : { error: 'bu şarkı sözleri, henüz eş zamanlı değil.' };
}

function ensureCube(lyricsDiv) {
  if (!document.getElementById('cube'))
    lyricsDiv.innerHTML = `<div class="cube" id="cube"><div class="side-front" id="front"></div><div class="side-bottom" id="bottom"></div></div>`;
}

function triggerCubeAnimation(newText) {
  if (state.currentLyricText === newText) return;

  const cube = document.getElementById('cube');
  const front = document.getElementById('front');
  const bottom = document.getElementById('bottom');

  if (!cube) return;

  bottom.textContent = newText;
  cube.classList.add('animate', 'show-next');

  setTimeout(() => {
    cube.classList.remove('animate', 'show-next');
    front.textContent = newText;
    state.currentLyricText = newText;
  }, 600);
}

function getCurrentProgressMs() {
  if (!state.timestamp) return state.progressMs;

  if (!state.isPlaying) {
    return state.progressMs;
  }

  return Math.min(
    state.progressMs + (Date.now() - state.timestamp),
    state.durationMs
  );
}

function updateUI() {
  if (!state.lastTrackLink) return;

  const progressMs = getCurrentProgressMs();
  const currentTime = progressMs / 1000;

  const nowPlayingEl = document.getElementById('now-playing');

  if (!nowPlayingEl) return;

  nowPlayingEl.innerHTML = `🎧 ${nowPlayingEl.dataset.artists} - <a href="${nowPlayingEl.dataset.trackLink}" target="_blank">${nowPlayingEl.dataset.name}</a> | ${formatTime(progressMs)}/${formatTime(state.durationMs)}`;

  if (!state.lyricsData) return;

  if (state.lyricsData.error) {
    document.getElementById('front').textContent = state.lyricsData.error;
    return;
  }

  triggerCubeAnimation(
    getCurrentLyric(
      state.lyricsData.syncedLyrics,
      currentTime
    ) || '...'
  );
}

function formatTime(ms) {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function scheduleNextSync() {
  clearTimeout(state.syncTimer);

  if (!state.isPlaying || !state.durationMs) {
    return;
  }

  const remaining = state.durationMs - getCurrentProgressMs();

  state.syncTimer = setTimeout(() => {
    fetchTrackData();
  }, Math.max(remaining + 1000, 1000));
}

function scheduleFallbackSync() {
  clearTimeout(state.fallbackTimer);

  state.fallbackTimer = setTimeout(() => {
    fetchTrackData();
  }, 30000);
}

async function fetchTrackData() {
  if (state.fetching) return;

  state.fetching = true;

  const nowPlayingEl = document.getElementById('now-playing');

  try {
    const data = await fetchJSON('https://akakadir.vercel.app/api/now-playing');

    ensureCube(document.getElementById('lyrics'));

    if (data.error) {
      nowPlayingEl.textContent = data.error;
      document.getElementById('front').textContent = '';
      return;
    }

    const newTrack = data.trackLink !== state.lastTrackLink;

    state.progressMs = parseTimeToSeconds(data.progress) * 1000;
    state.durationMs = parseTimeToSeconds(data.duration) * 1000;
    state.timestamp = Number(data.timestamp) || Date.now();
    state.isPlaying = Boolean(data.isPlaying);

    if (newTrack) {
      Object.assign(state, {
        lastTrackLink: data.trackLink,
        lyricsData: null,
        currentLyricText: ''
      });

      document.getElementById('front').textContent = 'yükleniyor...';
      document.getElementById('bottom').textContent = '';

      state.lyricsData = await fetchLyrics(data);
    }

    nowPlayingEl.dataset.artists = data.artists;
    nowPlayingEl.dataset.name = data.name;
    nowPlayingEl.dataset.trackLink = data.trackLink;

    updateUI();
    scheduleNextSync();
    scheduleFallbackSync();

  } catch {
    nowPlayingEl.textContent = 'bir şeyler ters gitti.';
    scheduleFallbackSync();
  } finally {
    state.fetching = false;
  }
}

fetchTrackData();

setInterval(updateUI, 250);

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    fetchTrackData();
  }
});
