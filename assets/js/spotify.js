const POLL_URL = 'https://akakadir.vercel.app/api/now-playing';
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

const fetchJSON = (url) => fetch(url).then((r) => r.json());
const parseTimeToSeconds = (t) => t.split(':').map(Number).reduce((m, s) => m * 60 + s);

const formatTime = (ms) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

function parseSyncedLyrics(synced) {
  return [...synced.matchAll(/\[(\d+):(\d+)(?:\.(\d+))?\](.*)/g)]
    .map(([, m, s, frac, text]) => ({
      time: Number(m) * 60000 + Number(s) * 1000 + (frac ? Number(`0.${frac}`) * 1000 : 0),
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

async function fetchLyrics({ type, duration, durationMs, artists, name, album }) {
  if (type === 'podcast') return { error: 'podcast liriklerini okuyamam.' };
  const params = new URLSearchParams({
    artist_name: artists,
    track_name: name,
    album_name: album,
    duration: Math.round((durationMs || parseTimeToSeconds(duration) * 1000) / 1000)
  });
  const { syncedLyrics } = await fetchJSON(`https://lrclib.net/api/get?${params}`);
  return syncedLyrics
    ? { lines: parseSyncedLyrics(syncedLyrics), type: 'synced' }
    : { error: 'bu şarkı sözleri, henüz eş zamanlı değil.' };
}

function ensureCube() {
  const lyricsDiv = document.getElementById('lyrics');
  if (lyricsDiv && !document.getElementById('cube'))
    lyricsDiv.innerHTML = `<div class="cube" id="cube"><div class="side-front" id="front"></div><div class="side-bottom" id="bottom"></div></div>`;
}

function triggerCubeAnimation(newText) {
  if (state.currentLyricText === newText || state.pendingLyricText === newText) return;
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
    `<img src="https://open.spotifycdn.com/cdn/images/error-page-logo.24aca703.svg" style="width:0.9em;height:0.9em;object-fit:contain;vertical-align:-0.12em"> ${data.artists} - <a class="no-favicon" href="${data.trackLink}" target="_blank">${data.name}</a> | <span id="progress-time">0:00</span>/${data.duration}`;
}

function render() {
  if (!state.trackData) return;
  const timeEl = document.getElementById('progress-time');
  if (timeEl) timeEl.textContent = formatTime(state.progressMs);
  if (!state.lyricsData) return;
  if (state.lyricsData.error) document.getElementById('front').textContent = state.lyricsData.error;
  else triggerCubeAnimation(getCurrentLyric(state.lyricsData.lines, state.progressMs) || '...');
}

function tick() {
  const now = performance.now();
  const delta = now - state.lastTickAt;
  state.lastTickAt = now;
  if (state.isPlaying && state.trackData) {
    state.progressMs += delta;
    if (state.durationMs && state.progressMs > state.durationMs) state.progressMs = state.durationMs;
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
    document.getElementById('now-playing').textContent = data?.error || 'bir şeyler ters gitti.';
    const front = document.getElementById('front');
    if (front) front.textContent = '';
    return;
  }

  const serverMs = data.progressMs ?? parseTimeToSeconds(data.progress) * 1000;
  state.isPlaying = data.isPlaying ?? true;
  state.durationMs = data.durationMs || parseTimeToSeconds(data.duration) * 1000;
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
    document.getElementById('front').textContent = 'yükleniyor...';
    document.getElementById('bottom').textContent = '';
    try {
      const lyrics = await fetchLyrics(data);
      if (token === state.lyricsToken) state.lyricsData = lyrics;
    } catch {
      if (token === state.lyricsToken) state.lyricsData = { error: 'sözleri getiremedim.' };
    }
  } else if (Math.abs(serverMs - state.progressMs) > SYNC_TOLERANCE_MS) {
    state.progressMs = serverMs;
  }

  render();
}

async function pollTrack() {
  try {
    await applyPayload(await fetchJSON(POLL_URL));
  } catch {
    document.getElementById('now-playing').textContent = 'bir şeyler ters gitti.';
  }
}

state.lastTickAt = performance.now();
pollTrack();
setInterval(pollTrack, POLL_MS);
setInterval(tick, 100);

document.addEventListener('visibilitychange', () => {
  if (document.hidden) return;
  state.lastTickAt = performance.now();
  pollTrack();
});
