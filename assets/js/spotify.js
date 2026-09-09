const state = {
  lastTrackLink: '',
  lyricsData: null,
  currentLyricText: '',
  progressSeconds: 0,
  durationSeconds: 0,
  progressSecondsAtSync: 0,
  lastSync: 0,
  isPlaying: true
};

const parseTimeToSeconds = (t) =>
  t.split(':').map(Number).reduce((m, s) => m * 60 + s);

const formatTime = (seconds) => {
  seconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(seconds / 60);
  const secs = String(seconds % 60).padStart(2, '0');
  return `${minutes}:${secs}`;
};

const fetchJSON = (url) => fetch(url).then((r) => r.json());

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

  const { syncedLyrics } = await fetchJSON(
    `https://lrclib.net/api/get?${params}`
  );

  return syncedLyrics
    ? { syncedLyrics, type: 'synced' }
    : { error: 'bu şarkı sözleri, henüz eş zamanlı değil.' };
}

function ensureCube(lyricsDiv) {
  if (!document.getElementById('cube')) {
    lyricsDiv.innerHTML = `
      <div class="cube" id="cube">
        <div class="side-front" id="front"></div>
        <div class="side-bottom" id="bottom"></div>
      </div>
    `;
  }
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

function updateProgress() {
  if (!state.lastTrackLink) return;

  if (state.isPlaying) {
    state.progressSeconds = Math.min(
      state.progressSecondsAtSync +
      (performance.now() - state.lastSync) / 1000,
      state.durationSeconds
    );
  }

  const nowPlayingEl = document.getElementById('now-playing');
  const progressEl = nowPlayingEl?.querySelector('[data-progress]');

  if (progressEl) {
    progressEl.textContent =
      `${formatTime(state.progressSeconds)}/${formatTime(state.durationSeconds)}`;
  }

  if (state.lyricsData?.syncedLyrics) {
    const lyric = getCurrentLyric(
      state.lyricsData.syncedLyrics,
      state.progressSeconds
    ) || '...';

    triggerCubeAnimation(lyric);
  }
}

async function fetchTrackData() {
  const nowPlayingEl = document.getElementById('now-playing');

  try {
    const data = await fetchJSON(
      'https://akakadir.vercel.app/api/now-playing'
    );

    ensureCube(document.getElementById('lyrics'));

    if (data.error) {
      nowPlayingEl.textContent = data.error;
      document.getElementById('front').textContent = '';
      state.isPlaying = false;
      return;
    }

    const newTrack = data.trackLink !== state.lastTrackLink;

    state.progressSeconds = parseTimeToSeconds(data.progress);
    state.durationSeconds = parseTimeToSeconds(data.duration);
    state.progressSecondsAtSync = state.progressSeconds;
    state.lastSync = performance.now();
    state.isPlaying = true;

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

    nowPlayingEl.innerHTML = `
      🎧 ${data.artists} - <a href="${data.trackLink}" target="_blank">${data.name}</a> | <span data-progress>${data.progress}/${data.duration}</span>
    `;

    if (!state.lyricsData) return;

    if (state.lyricsData.error) {
      document.getElementById('front').textContent =
        state.lyricsData.error;
      return;
    }

    updateProgress();

  } catch {
    nowPlayingEl.textContent = 'bir şeyler ters gitti.';
  }
}

fetchTrackData();

setInterval(updateProgress, 250);

setInterval(fetchTrackData, 10000);

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    fetchTrackData();
  }
});
