let lastTrackLink = '';
let lyricsData = null;
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
function fetchLyrics(artist, track, album, durationSeconds) {
  const durationInt = Math.round(durationSeconds);
  const url = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(track)}&album_name=${encodeURIComponent(album)}&duration=${durationInt}`;
  
  fetch(url)
    .then(response => response.json())
    .then(data => {
      if (data.error) {
        lyricsData = { error: '[bir hata oluştu.]' };
      } else if (data.syncedLyrics) {
        lyricsData = { ...data, type: 'synced' };
      } else if (data.plainLyrics) {
        lyricsData = { ...data, type: 'plain' };
      } else {
        lyricsData = { error: '[sözleri bulamadım.]' };
      }
    })
    .catch(error => {
      console.error('Lyrics fetch error:', error);
      lyricsData = { error: '[LRCLIB hatası.]' };
    });
}
function fetchTrackData() {
  fetch('https://spotify-now-playing-tau-eight.vercel.app/api/now-playing')
    .then(response => response.json())
    .then(data => {
      if (data.error) {
        document.getElementById('now-playing').innerHTML = `${data.error}`;
        document.getElementById('lyrics').innerHTML = '';
      } else {
        if (data.trackLink !== lastTrackLink) {
          lastTrackLink = data.trackLink;
          lyricsData = null;
          
          if (data.type !== 'podcast') {
            const durationSeconds = parseTimeToSeconds(data.duration);
            fetchLyrics(data.artists, data.name, data.album, durationSeconds);
          } else {
            lyricsData = { error: '[podcast dinliyorum, sözleri çekemem.]' };
          }
        }
        
        const currentProgressSeconds = parseTimeToSeconds(data.progress);
        const trackLinkHTML = `<a href="${data.trackLink}" target="_blank">${data.name}</a>`;
        
        document.getElementById('now-playing').innerHTML = `🎧 ${data.artists} - ${trackLinkHTML} | ${data.progress}/${data.duration}`;
        
        const lyricsElement = document.getElementById('lyrics');
        if (lyricsData === null) {
          lyricsElement.innerHTML = '[yükleniyor...]';
        } else if (lyricsData.error) {
          lyricsElement.innerHTML = `${lyricsData.error}`;
        } else if (lyricsData.type === 'synced') {
          const currentLyric = getCurrentLyric(lyricsData, currentProgressSeconds);
          lyricsElement.innerHTML = currentLyric ? `[${currentLyric}]` : '[...]';
        } else if (lyricsData.type === 'plain') {
          lyricsElement.innerHTML = '[bu şarkı sözleri, henüz eş zamanlı değil.]';
        } else {
          lyricsElement.innerHTML = '[sözleri bulamadım.]';
        }
      }
    })
    .catch(error => {
      document.getElementById('now-playing').innerHTML = '[çalma bilgisini çekemedim.]';
      document.getElementById('lyrics').innerHTML = '';
    });
}
fetchTrackData();
setInterval(fetchTrackData, 1000);
