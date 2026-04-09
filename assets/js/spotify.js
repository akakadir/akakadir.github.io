let lastTrackLink = '', lastGifUrl = '', lyricsData = null, currentLyricText = '';

const parseTime = (t) => t.split(':').reduce((acc, time) => (60 * acc) + +time);

function getCurrentLyric(lyrics, time) {
    if (!lyrics?.syncedLyrics) return null;
    return lyrics.syncedLyrics.split('\n').reduce((prev, line) => {
        const m = line.match(/\[(\d+):(\d+)\.(\d+)\]/);
        return m && (parseInt(m[1]) * 60 + parseInt(m[2])) <= time ? line.replace(m[0], '').trim() : prev;
    }, null);
}

function triggerCube(text) {
    const cube = document.getElementById('cube'), b = document.getElementById('bottom'), f = document.getElementById('front');
    if (!cube || currentLyricText === text) return;
    b.textContent = text;
    cube.classList.add('animate', 'show-next');
    setTimeout(() => {
        cube.classList.remove('animate', 'show-next');
        f.textContent = currentLyricText = text;
    }, 600);
}

async function fetchTrackData() {
    try {
        const res = await fetch('https://akakadir.vercel.app/api/now-playing');
        const data = await res.json();
        
        if (!document.getElementById('cube')) {
            document.getElementById('lyrics').innerHTML = '<div class="cube" id="cube"><div class="side-front" id="front"></div><div class="side-bottom" id="bottom"></div></div>';
            document.getElementById('now-playing').innerHTML = `<img id="main-gif" src="${data.gif}"><span id="track-content"></span>`;
            lastGifUrl = data.gif;
        }

        const gifImg = document.getElementById('main-gif');
        const front = document.getElementById('front');

        if (data.error) {
            if (lastGifUrl !== data.gif) {
                gifImg.src = lastGifUrl = data.gif;
            }
            document.getElementById('track-content').textContent = ` ${data.error}`;
            front.textContent = '';
            return;
        }

        if (data.trackLink !== lastTrackLink) {
            lastTrackLink = data.trackLink;
            lyricsData = null;
            front.textContent = 'yükleniyor...';
            
            if (data.type !== 'podcast') {
                const lrc = await fetch(`https://lrclib.net/api/get?artist_name=${encodeURIComponent(data.artists)}&track_name=${encodeURIComponent(data.name)}&duration=${Math.round(parseTime(data.duration))}`).then(r => r.json());
                lyricsData = lrc.syncedLyrics ? { ...lrc, type: 'synced' } : { error: 'asenkron parçaların sözlerini çekemem.' };
            } else lyricsData = { error: 'podcast sözlerini çekemem.' };
        }

        if (lastGifUrl !== data.gif) {
            gifImg.src = lastGifUrl = data.gif;
        }

        document.getElementById('track-content').innerHTML = ` ${data.artists} - <a href="${data.trackLink}" target="_blank">${data.name}</a> | ${data.progress}/${data.duration}`;

        if (lyricsData?.type === 'synced') triggerCube(getCurrentLyric(lyricsData, parseTime(data.progress)) || '...');
        else if (lyricsData?.error) front.textContent = lyricsData.error;

    } catch (e) {
        const sww = "https://akakadir.vercel.app/gifboard/sww.gif";
        if (lastGifUrl !== sww) {
            const np = document.getElementById('now-playing');
            if (np) np.innerHTML = `<img id="main-gif" src="${sww}"><span> bir şeyler ters gitti.</span>`;
            lastGifUrl = sww;
        }
        const f = document.getElementById('front');
        if (f) f.textContent = '';
    }
}

setInterval(fetchTrackData, 1000);
fetchTrackData();
