let lastTrackLink = '';

function getSettings() {
  const linkColor = localStorage.getItem("linkColor") || "#53a245";
  return { linkColor };
}

function applySettings() {
  const settings = getSettings();
  
  const trackLink = document.querySelector('#now-playing a');
  if (trackLink) {
    trackLink.style.color = settings.linkColor;
  }
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  seconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function fetchTrackData() {
  fetch('https://spotify-now-playing-akakadirs-projects.vercel.app/api/now-playing')
    .then(response => response.json())
    .then(data => {
      if (data.error) {
        document.getElementById('now-playing').innerHTML = data.error;
      } else {
        if (data.trackLink !== lastTrackLink) {
          lastTrackLink = data.trackLink;
        }
        const progressParts = data.progress.split(':').map(Number);
        const durationParts = data.duration.split(':').map(Number);
        const currentProgressSeconds = progressParts[0] * 60 + progressParts[1];
        const totalDurationSeconds = durationParts[0] * 60 + durationParts[1];
        const trackLinkHTML = `<a href="${data.trackLink}" target="_blank">${data.name}</a>`;
        document.getElementById('now-playing').innerHTML = `🎧 Şu an dinliyorum: `+`${data.artists} - ${trackLinkHTML} | ${formatTime(currentProgressSeconds)}/${data.duration}`;
        
        applySettings();
      }
    });
}

fetchTrackData();

setInterval(fetchTrackData, 1000);
