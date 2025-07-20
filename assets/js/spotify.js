class SpotifyNowPlaying {
  constructor() {
    this.state = {
      lastTrackLink: '',
      lyricsData: null,
      currentTrack: null,
      isPlaying: false,
      trackDuration: 0,
      lastServerProgress: 0,
      lastServerTime: 0
    };
    this.intervals = { fetch: null, lyrics: null };
    this.init();
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  parseTimeToSeconds(timeStr) {
    const [minutes, seconds] = timeStr.split(':').map(Number);
    return minutes * 60 + seconds;
  }

  calculateCurrentProgress() {
    if (!this.state.isPlaying || !this.state.lastServerTime || !this.state.currentTrack) {
      return this.state.lastServerProgress;
    }
    const timeSinceLastUpdate = (Date.now() - this.state.lastServerTime) / 1000;
    const estimatedProgress = this.state.lastServerProgress + timeSinceLastUpdate;
    return Math.max(0, Math.min(estimatedProgress, this.state.trackDuration));
  }

  getCurrentLyric(lyrics, currentTime) {
    if (!lyrics?.syncedLyrics) return null;
    if (!lyrics._parsedLines) {
      lyrics._parsedLines = lyrics.syncedLyrics
        .split('\n')
        .map(line => {
          const timeMatch = line.match(/\[(\d+):(\d+)\.(\d+)\]/);
          if (timeMatch) {
            const totalSeconds = parseInt(timeMatch[1]) * 60 + parseInt(timeMatch[2]);
            return { time: totalSeconds, text: line.replace(timeMatch[0], '').trim() };
          }
          return null;
        })
        .filter(Boolean)
        .sort((a, b) => a.time - b.time);
    }
    const lines = lyrics._parsedLines;
    let currentLine = null;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].time <= currentTime) {
        currentLine = lines[i].text;
      } else break;
    }
    return currentLine;
  }

  async fetchLyrics(artist, track, album, duration) {
    try {
      const url = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(track)}&album_name=${encodeURIComponent(album)}&duration=${Math.round(duration)}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.error) return { error: '[bir hata oluştu.]' };
      if (data.syncedLyrics) return { ...data, type: 'synced' };
      if (data.plainLyrics) return { ...data, type: 'plain' };
      return { error: '[sözleri bulamadım.]' };
    } catch (error) {
      return { error: '[LRCLIB hatası.]' };
    }
  }

  async fetchTrackData() {
    try {
      const response = await fetch('https://spotify-now-playing-tau-eight.vercel.app/api/now-playing');
      const data = await response.json();
      
      if (data.error) {
        this.state.currentTrack = null;
        this.state.isPlaying = false;
        this.state.lyricsData = null;
        this.state.lastTrackLink = '';
        this.state.lastServerProgress = 0;
        this.state.lastServerTime = 0;
        this.updateUI({ error: data.error });
        return;
      }

      const currentServerProgress = this.parseTimeToSeconds(data.progress);
      const trackChanged = data.trackLink !== this.state.lastTrackLink;
      
      if (trackChanged) {
        this.state.lastTrackLink = data.trackLink;
        this.state.lyricsData = null;
        this.state.trackDuration = this.parseTimeToSeconds(data.duration);
        this.state.isPlaying = true;
      }

      const progressStayedSame = this.state.lastServerProgress === currentServerProgress && 
                                 this.state.lastServerProgress > 0 && !trackChanged;
      
      if (progressStayedSame && this.state.isPlaying) {
        this.state.isPlaying = false;
      } else if (currentServerProgress !== this.state.lastServerProgress) {
        this.state.isPlaying = true;
      }

      this.state.currentTrack = data;
      this.state.lastServerProgress = currentServerProgress;
      this.state.lastServerTime = Date.now();

      if (trackChanged) {
        this.fetchLyrics(data.artists, data.name, data.album, this.state.trackDuration)
          .then(lyrics => { this.state.lyricsData = lyrics; });
      }

    } catch (error) {
      this.updateUI({ error: '[çalma bilgisini çekemedim.]' });
    }
  }

  updateUI(errorData = null) {
    const nowPlayingEl = document.getElementById('now-playing');
    const lyricsEl = document.getElementById('lyrics');

    if (errorData) {
      nowPlayingEl.innerHTML = errorData.error;
      lyricsEl.innerHTML = '';
      return;
    }

    if (!this.state.currentTrack) {
      nowPlayingEl.innerHTML = '[şu an müzik çalmıyor.]';
      lyricsEl.innerHTML = '';
      return;
    }

    const track = this.state.currentTrack;
    const currentProgress = this.calculateCurrentProgress();
    const progressFormatted = this.formatTime(Math.floor(currentProgress));
    const trackLinkHTML = `<a href="${track.trackLink}" target="_blank">${track.name}</a>`;
    const playingIndicator = this.state.isPlaying ? '🎧' : '⏸️';
    nowPlayingEl.innerHTML = `${playingIndicator} Şu an dinliyorum: ${track.artists} - ${trackLinkHTML} | ${progressFormatted}/${track.duration}`;

    if (this.state.lyricsData === null) {
      lyricsEl.innerHTML = '[yükleniyor...]';
    } else if (this.state.lyricsData.error) {
      lyricsEl.innerHTML = this.state.lyricsData.error;
    } else if (this.state.lyricsData.type === 'synced') {
      const currentLyric = this.getCurrentLyric(this.state.lyricsData, currentProgress);
      lyricsEl.innerHTML = currentLyric ? `[${currentLyric}]` : '[...]';
    } else if (this.state.lyricsData.type === 'plain') {
      lyricsEl.innerHTML = '[bu şarkı sözleri, henüz eş zamanlı değil.]';
    } else {
      lyricsEl.innerHTML = '[sözleri bulamadım.]';
    }
  }

  startIntervals() {
    this.intervals.fetch = setInterval(() => this.fetchTrackData(), 5000);
    this.intervals.lyrics = setInterval(() => { if (this.state.currentTrack) this.updateUI(); }, 500);
  }

  stopIntervals() {
    Object.values(this.intervals).forEach(interval => { if (interval) clearInterval(interval); });
  }

  handleVisibilityChange() {
    if (document.hidden) {
      this.stopIntervals();
      this.intervals.fetch = setInterval(() => this.fetchTrackData(), 10000);
    } else {
      this.stopIntervals();
      this.startIntervals();
      this.fetchTrackData();
    }
  }

  async init() {
    await this.fetchTrackData();
    this.startIntervals();
    document.addEventListener('visibilitychange', () => this.handleVisibilityChange());
    window.addEventListener('beforeunload', () => this.stopIntervals());
  }

  refresh() { this.fetchTrackData(); }
}

const spotifyPlayer = new SpotifyNowPlaying();
window.refreshSpotify = () => spotifyPlayer.refresh();
