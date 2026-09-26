const state = { lastTrackLink: '', lyricsData: null, currentLyricText: '', base: null, baseAt: 0 };

const parseTimeToSeconds = (t) => t.split(':').map(Number).reduce((m, s) => m * 60 + s);
const fetchJSON = (url) => fetch(url).then((r) => r.json());

function formatTime(ms) {
  const safeMs = Math.max(0, ms);
  const minutes = Math.floor(safeMs / 60000);
  const seconds = Math.floor((safeMs % 60000) / 1000).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function getCurrentLyric(syncedLyrics, currentTime) {
  return [...syncedLyrics.matchAll(/\[(\d+):(\d+)\.\d+\](.*)/g)]
    .filter(([, m, s]) => parseInt(m) * 60 + parseInt(s) <= currentTime)
    .at(-1)?.[3]?.trim() ?? null;
}

async function fetchLyrics({ type, duration, artists, name, album }) {
  if (type === 'podcast') return { error: 'podcast liriklerini okuyamam.' };
  const params = new URLSearchParams({ artist_name: artists, track_name: name, album_name: album, duration: Math.round(parseTimeToSeconds(duration)) });
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

async function handleUpdate(data) {
  state.base = data;
  state.baseAt = Date.now();

  ensureCube(document.getElementById('lyrics'));

  if (data.error) {
    document.getElementById('now-playing').textContent = data.error;
    document.getElementById('front').textContent = '';
    state.lastTrackLink = '';
    state.lyricsData = null;
    return;
  }

  if (data.trackLink !== state.lastTrackLink) {
    state.lastTrackLink = data.trackLink;
    state.lyricsData = null;
    state.currentLyricText = '';
    document.getElementById('front').textContent = 'yükleniyor...';
    document.getElementById('bottom').textContent = '';
    state.lyricsData = await fetchLyrics(data);
  }
}

function renderTick() {
  const { base } = state;
  if (!base || base.error) return;

  const elapsed = base.isPlaying ? Date.now() - state.baseAt : 0;
  const progressMs = Math.min(base.progressMs + elapsed, base.durationMs || Number.MAX_SAFE_INTEGER);
  const progress = formatTime(progressMs);

  document.getElementById('now-playing').innerHTML =
    `🎧 ${base.artists} - <a href="${base.trackLink}" target="_blank">${base.name}</a> | ${progress}/${base.duration}`;

  if (!state.lyricsData) return;
  if (state.lyricsData.error) document.getElementById('front').textContent = state.lyricsData.error;
  else triggerCubeAnimation(getCurrentLyric(state.lyricsData.syncedLyrics, progressMs / 1000) || '...');
}

const source = new EventSource('https://akakadir.vercel.app/api/now-playing/stream');
source.onmessage = (e) => handleUpdate(JSON.parse(e.data));
source.onerror = () => {
  document.getElementById('now-playing').textContent = 'bağlantı koptu, yeniden bağlanılıyor...';
};

setInterval(renderTick, 250);
