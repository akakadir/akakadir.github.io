const state = { lastTrackLink: '', lyricsData: null, currentLyricText: '' };

const parseTimeToSeconds = (t) => t.split(':').map(Number).reduce((m, s) => m * 60 + s);
const fetchJSON = (url) => fetch(url).then((r) => r.json());

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

async function fetchTrackData() {
  const nowPlayingEl = document.getElementById('now-playing');
  try {
    const data = await fetchJSON('https://akakadir.vercel.app/api/now-playing');
    ensureCube(document.getElementById('lyrics'));
    if (data.error) { nowPlayingEl.textContent = data.error; document.getElementById('front').textContent = ''; return; }
    if (data.trackLink !== state.lastTrackLink) {
      Object.assign(state, { lastTrackLink: data.trackLink, lyricsData: null, currentLyricText: '' });
      document.getElementById('front').textContent = 'yükleniyor...';
      document.getElementById('bottom').textContent = '';
      state.lyricsData = await fetchLyrics(data);
    }
    nowPlayingEl.innerHTML = `🎧 ${data.artists} — <a href="${data.trackLink}" target="_blank">${data.name}</a> | ${data.progress}/${data.duration}`;
    if (!state.lyricsData) return;
    if (state.lyricsData.error) document.getElementById('front').textContent = state.lyricsData.error;
    else triggerCubeAnimation(getCurrentLyric(state.lyricsData.syncedLyrics, parseTimeToSeconds(data.progress)) || '...');
  } catch {
    nowPlayingEl.textContent = 'bir şeyler ters gitti.';
  }
}

fetchTrackData();
setInterval(fetchTrackData, 1000);
