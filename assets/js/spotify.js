let lastTrackLink = '';
let lyricsData = null;
let currentLyricText = '';

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  seconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function parseTimeToSeconds(timeStr) {
  const parts = timeStr.split(':').map(Number);
  return parts[0] * 60 + parts[1];
}

function getCurrentLyric(lyrics, currentTime) {
  if (!lyrics || !lyrics.syncedLyrics) return null;
  
  const lines = lyrics.syncedLyrics.split('\n');
  let currentLine = null;
  
  for (const line of lines) {
    const timeMatch = line.match(/\[(\d+):(\d+)\.(\d+)\]/);
    if (timeMatch) {
      const minutes = parseInt(timeMatch[1]);
      const seconds = parseInt(timeMatch[2]);
      const totalSeconds = minutes * 60 + seconds;
      
      if (totalSeconds <= currentTime) {
        currentLine = line.replace(timeMatch[0], '').trim();
      } else {
        break;
      }
    }
  }
  
  return currentLine;
}

function triggerCubeAnimation(newText) {
  const cube = document.getElementById('cube');
  const front = document.getElementById('front');
  const bottom = document.getElementById('bottom');
  
  if (!cube || currentLyricText === newText) return;

  bottom.textContent = `${newText}`;
  cube.classList.add('animate');
  cube.classList.add('show-next');

  setTimeout(() => {
    cube.classList.remove('animate');
    cube.classList.remove('show-next');
    front.textContent = `${newText}`;
    currentLyricText = newText;
  }, 600);
}

function fetchLyrics(artist, track, album, durationSeconds) {
  const durationInt = Math.round(durationSeconds);
  const url = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(track)}&album_name=${encodeURIComponent(album)}&duration=${durationInt}`;
  
  fetch(url)
    .then(response => response.json())
    .then(data => {
      if (data.error) {
        lyricsData = { error: 'bir şeyler ters gitti.' };
      } else if (data.syncedLyrics) {
        lyricsData = { ...data, type: 'synced' };
      } else if (data.plainLyrics) {
        lyricsData = { ...data, type: 'plain' };
      } else {
        lyricsData = { error: 'sözleri bulamadım.' };
      }
    })
    .catch(error => {
      console.error('Lyrics fetch error:', error);
      lyricsData = { error: 'LRCLIB hatası.' };
    });
}

function fetchTrackData() {
  fetch('https://akakadir.vercel.app/api/now-playing')
    .then(response => response.json())
    .then(data => {
      const lyricsElement = document.getElementById('lyrics');
      
      if (!document.getElementById('cube')) {
        lyricsElement.innerHTML = `<div class="cube" id="cube"><div class="side-front" id="front"></div><div class="side-bottom" id="bottom"></div></div>`;
      }

      const frontFace = document.getElementById('front');

      if (data.error) {
        document.getElementById('now-playing').innerHTML = `${data.error}`;
        if(frontFace) frontFace.innerHTML = '';
      } else {
        if (data.trackLink !== lastTrackLink) {
          lastTrackLink = data.trackLink;
          lyricsData = null;
          currentLyricText = '';
          
          if (data.type !== 'podcast') {
            const durationSeconds = parseTimeToSeconds(data.duration);
            fetchLyrics(data.artists, data.name, data.album, durationSeconds);
          } else {
            lyricsData = { error: 'podcast sözlerini henüz çekemem.' };
          }
        }
        
        const currentProgressSeconds = parseTimeToSeconds(data.progress);
        const trackLinkHTML = `<a href="${data.trackLink}" target="_blank">${data.name}</a>`;
        
        document.getElementById('now-playing').innerHTML = `🎧 ${data.artists} - ${trackLinkHTML} | ${data.progress}/${data.duration}`;
        
        if (!frontFace) return;

        if (lyricsData === null) {
          frontFace.innerHTML = 'yükleniyor...';
        } else if (lyricsData.error) {
          frontFace.innerHTML = `${lyricsData.error}`;
        } else if (lyricsData.type === 'synced') {
          const currentLyric = getCurrentLyric(lyricsData, currentProgressSeconds);
          const nextText = currentLyric ? currentLyric : '...';
          triggerCubeAnimation(nextText);
        } else if (lyricsData.type === 'plain') {
          frontFace.innerHTML = 'şarkı sözleri eş zamanlı değil.';
        } else {
          frontFace.innerHTML = 'sözleri bulamadım.';
        }
      }
    })
    .catch(error => {
      document.getElementById('now-playing').innerHTML = 'bir şeyler ters gitti.';
      const front = document.getElementById('front');
      if(front) front.innerHTML = '';
    });
}

fetchTrackData();
setInterval(fetchTrackData, 1000);
