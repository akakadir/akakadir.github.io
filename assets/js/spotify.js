let lastTrackLink = '';
let lyricsData = null;
let currentLyricText = '';

function parseTimeToSeconds(timeStr) {
  const [min, sec] = timeStr.split(':').map(Number);
  return min * 60 + sec;
}

function getCurrentLyric(lyrics, currentTime) {
  if (!lyrics?.syncedLyrics) return null;
  const lines = lyrics.syncedLyrics.split('\n');
  let currentLine = null;
  for (const line of lines) {
    const match = line.match(/\[(\d+):(\d+)\.(\d+)\]/);
    if (match) {
      const ts = parseInt(match[1]) * 60 + parseInt(match[2]);
      if (ts <= currentTime) currentLine = line.replace(match[0], '').trim();
      else break;
    }
  }
  return currentLine;
}

function triggerCubeAnimation(newText) {
  const cube = document.getElementById('cube');
  const front = document.getElementById('front');
  const bottom = document.getElementById('bottom');
  if (!cube || currentLyricText === newText) return;

  bottom.textContent = newText;
  cube.classList.add('animate', 'show-next');

  setTimeout(() => {
    cube.classList.remove('animate', 'show-next');
    front.textContent = newText;
    currentLyricText = newText;
  }, 600);
}

async function fetchTrackData() {
  try {
    const response = await fetch('https://akakadir.vercel.app/api/now-playing');
    const data = await response.json();
    const lyricsDiv = document.getElementById('lyrics');
    
    if (!document.getElementById('cube')) {
      lyricsDiv.innerHTML = `<div class="cube" id="cube"><div class="side-front" id="front"></div><div class="side-bottom" id="bottom"></div></div>`;
    }

    const front = document.getElementById('front');
    const bottom = document.getElementById('bottom');

    if (data.error) {
      document.getElementById('now-playing').textContent = data.error;
      front.textContent = '';
      return;
    }

    if (data.trackLink !== lastTrackLink) {
      lastTrackLink = data.trackLink;
      lyricsData = null;
      currentLyricText = '';
      front.textContent = 'yükleniyor...';
      bottom.textContent = '';

      if (data.type !== 'podcast') {
        const dur = parseTimeToSeconds(data.duration);
        const url = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(data.artists)}&track_name=${encodeURIComponent(data.name)}&album_name=${encodeURIComponent(data.album)}&duration=${Math.round(dur)}`;
        const lrcRes = await fetch(url);
        const lrcData = await lrcRes.json();
        lyricsData = lrcData.syncedLyrics ? { ...lrcData, type: 'synced' } : { error: 'bu lirikler veritabanımda yok.' };
      } else {
        lyricsData = { error: 'podcast liriklerini okuyamam.' };
      }
    }

    document.getElementById('now-playing').innerHTML = `🎧 ${data.artists} - <a href="${data.trackLink}" target="_blank">${data.name}</a> | ${data.progress}/${data.duration}`;

    if (!lyricsData) return;

    if (lyricsData.error) {
      front.textContent = lyricsData.error;
    } else if (lyricsData.type === 'synced') {
      const current = getCurrentLyric(lyricsData, parseTimeToSeconds(data.progress));
      triggerCubeAnimation(current || '...');
    }
  } catch (e) {
    document.getElementById('now-playing').textContent = 'bir şeyler ters gitti.';
  }
}

setInterval(fetchTrackData, 1000);
fetchTrackData();
