const POLL_URL = 'https://akakadir.vercel.app/api/now-playing';
const POLL_MS = 5000;
const SYNC_CORRECTION_MS = 304;
const YOUTUBE_SYNC_MS = 218;

const state = {
  lastTrackLink: '',
  lyricsData: null,
  currentLyricText: '',
  pendingLyricText: null,
  trackData: null,
  progressMs: 0,
  durationMs: 0,
  isPlaying: false,
  serverTime: 0,
  progressAnchorMs: 0,
  progressAnchorPerformance: 0,
  lyricsToken: 0,
  lyricsAbort: null,

  musicChoice: null,
  musicPromptShown: false,
  countdownActive: false,
  countdownRunId: 0,

  pollInFlight: false,
  pollAgain: false,

  youtube: {
    player: null,
    ready: false,
    videoId: '',
    apiPromise: null,
    syncInFlight: false,
    cueSequence: 0,
    cuedSequence: 0,
    pendingCue: null
  }
};

const fetchJSON = async (url, options = {}) => {
  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
};

const parseTimeToSeconds = (value) =>
  String(value || '0:00')
    .split(':')
    .map(Number)
    .reduce(
      (minutes, seconds) =>
        minutes * 60 + seconds,
      0
    );

const formatTime = (ms) => {
  const total =
    Math.max(
      0,
      Math.floor(ms / 1000)
    );

  return `${Math.floor(total / 60)}:${String(
    total % 60
  ).padStart(2, '0')}`;
};

function injectStyles() {
  if (
    document.getElementById(
      'spotify-widget-styles'
    )
  ) {
    return;
  }

  const style =
    document.createElement('style');

  style.id =
    'spotify-widget-styles';

  style.textContent = `
    .music-consent {
      display: block;
      width: 100%;
      margin-top: 14px;
      text-align: center;
    }

    .music-question {
      display: block;
      width: 100%;
    }

    .music-options {
      display: block;
      width: 100%;
      margin-top: 4px;
      text-align: center;
    }

    .music-option {
      cursor: pointer;
    }

    .music-countdown {
      display: block;
      width: 100%;
      margin-top: 10px;
      text-align: center;
    }

    .youtube-background-player {
      position: fixed;
      width: 200px;
      height: 200px;
      left: -10000px;
      top: -10000px;
      opacity: 0;
      pointer-events: none;
      overflow: hidden;
    }
  `;

  document.head.appendChild(
    style
  );
}

function syncMusicStyles() {
  const front =
    document.getElementById('front');

  if (!front) {
    return;
  }

  let style =
    document.getElementById(
      'spotify-widget-lyrics-style'
    );

  if (!style) {
    style =
      document.createElement(
        'style'
      );

    style.id =
      'spotify-widget-lyrics-style';

    document.head.appendChild(
      style
    );
  }

  const computed =
    getComputedStyle(front);

  const properties = [
    'font-family',
    'font-style',
    'font-weight',
    'font-variant',
    'letter-spacing',
    'line-height',
    'text-transform',
    'text-decoration',
    'text-shadow',
    'color',
    'opacity',
    'word-spacing',
    'white-space'
  ];

  const css =
    properties
      .map(
        (property) =>
          `${property}: ${computed.getPropertyValue(
            property
          )};`
      )
      .join('\n');

  const fontSize =
    parseFloat(
      computed.fontSize
    );

  const smallFontSize =
    Number.isFinite(fontSize)
      ? Math.max(
          1,
          fontSize * 0.75
        )
      : null;

  style.textContent = `
    .music-consent,
    .music-question,
    .music-options,
    .music-option,
    .music-countdown {
      ${css}
      ${
        smallFontSize
          ? `font-size: ${smallFontSize}px;`
          : ''
      }
    }
  `;
}

function parseSyncedLyrics(synced) {
  return [
    ...synced.matchAll(
      /\[(\d+):(\d+)(?:\.(\d+))?\](.*)/g
    )
  ]
    .map(
      ([
        ,
        minutes,
        seconds,
        fraction,
        text
      ]) => ({
        time:
          Number(minutes) * 60000 +
          Number(seconds) * 1000 +
          (fraction
            ? Number(
                `0.${fraction}`
              ) * 1000
            : 0),
        text: text.trim()
      })
    )
    .sort(
      (a, b) =>
        a.time - b.time
    );
}

function getCurrentLyric(
  lines,
  currentMs
) {
  let found = null;

  for (const line of lines) {
    if (
      line.time >
      currentMs
    ) {
      break;
    }

    found = line.text;
  }

  return found || null;
}

async function fetchLyrics({
  type,
  duration,
  durationMs,
  artists,
  name,
  album
}) {
  if (type === 'podcast') {
    return {
      error:
        'podcast liriklerini okuyamam.'
    };
  }

  if (state.lyricsAbort) {
    state.lyricsAbort.abort();
  }

  const controller =
    new AbortController();

  state.lyricsAbort =
    controller;

  const params =
    new URLSearchParams({
      artist_name:
        artists || '',
      track_name:
        name || '',
      album_name:
        album || '',
      duration: Math.round(
        (
          durationMs ||
          parseTimeToSeconds(
            duration
          ) * 1000
        ) / 1000
      )
    });

  try {
    const response =
      await fetch(
        `https://lrclib.net/api/get?${params}`,
        {
          signal:
            controller.signal
        }
      );

    if (!response.ok) {
      return {
        error:
          'bu şarkı sözleri, henüz eşzamanlı değil.'
      };
    }

    const data =
      await response.json();

    if (
      !data?.syncedLyrics
    ) {
      return {
        error:
          'bu şarkı sözleri, henüz eşzamanlı değil.'
      };
    }

    return {
      lines:
        parseSyncedLyrics(
          data.syncedLyrics
        ),
      type:
        'synced'
    };
  } catch (error) {
    if (
      error.name ===
      'AbortError'
    ) {
      return null;
    }

    return {
      error:
        'bu şarkı sözleri, henüz eşzamanlı değil.'
    };
  }
}

function ensureLyricsCube() {
  const lyricsDiv =
    document.getElementById(
      'lyrics'
    );

  if (!lyricsDiv) {
    return;
  }

  if (
    !document.getElementById(
      'cube'
    )
  ) {
    lyricsDiv.innerHTML = `
      <div class="cube" id="cube">
        <div class="side-front" id="front"></div>
        <div class="side-bottom" id="bottom"></div>
      </div>
    `;
  }

  syncMusicStyles();
}

function triggerLyricAnimation(
  newText
) {
  if (
    state.currentLyricText ===
      newText ||
    state.pendingLyricText ===
      newText
  ) {
    return;
  }

  const cube =
    document.getElementById(
      'cube'
    );

  const front =
    document.getElementById(
      'front'
    );

  const bottom =
    document.getElementById(
      'bottom'
    );

  if (
    !cube ||
    !front ||
    !bottom
  ) {
    return;
  }

  state.pendingLyricText =
    newText;

  bottom.textContent =
    newText;

  cube.classList.add(
    'animate',
    'show-next'
  );

  setTimeout(() => {
    cube.classList.remove(
      'animate',
      'show-next'
    );

    front.textContent =
      newText;

    state.currentLyricText =
      newText;

    state.pendingLyricText =
      null;

    syncMusicStyles();
  }, 600);
}

function removeMusicPrompt() {
  const prompt =
    document.getElementById(
      'music-consent'
    );

  if (prompt) {
    prompt.remove();
  }
}

function createMusicPrompt() {
  if (
    state.musicChoice !==
      null ||
    state.musicPromptShown
  ) {
    return;
  }

  const lyricsDiv =
    document.getElementById(
      'lyrics'
    );

  if (!lyricsDiv) {
    return;
  }

  if (
    document.getElementById(
      'music-consent'
    )
  ) {
    state.musicPromptShown =
      true;

    return;
  }

  const prompt =
    document.createElement(
      'div'
    );

  prompt.id =
    'music-consent';

  prompt.className =
    'music-consent';

  prompt.innerHTML = `
    <div class="music-question">
      beraber dinleyelim mi?
    </div>
    <div class="music-options">
      <span class="music-option" data-action="yes">olur</span>
      <span> / </span>
      <span class="music-option" data-action="no">yok ya</span>
    </div>
  `;

  lyricsDiv.insertAdjacentElement(
    'afterend',
    prompt
  );

  state.musicPromptShown =
    true;

  syncMusicStyles();

  prompt.addEventListener(
    'click',
    (event) => {
      const action =
        event.target?.dataset
          ?.action;

      if (!action) {
        return;
      }

      state.musicChoice =
        action === 'yes'
          ? 'yes'
          : 'no';

      prompt.remove();

      if (
        action === 'yes'
      ) {
        startMusicSequence();
      }
    }
  );
}

function createCountdown() {
  const existing =
    document.getElementById(
      'music-countdown'
    );

  if (existing) {
    return existing;
  }

  const lyricsDiv =
    document.getElementById(
      'lyrics'
    );

  if (!lyricsDiv) {
    return null;
  }

  const countdown =
    document.createElement(
      'div'
    );

  countdown.id =
    'music-countdown';

  countdown.className =
    'music-countdown';

  lyricsDiv.insertAdjacentElement(
    'afterend',
    countdown
  );

  syncMusicStyles();

  return countdown;
}

function removeCountdown() {
  const countdown =
    document.getElementById(
      'music-countdown'
    );

  if (countdown) {
    countdown.remove();
  }

  state.countdownActive =
    false;
}

function cancelPendingCue() {
  const pending =
    state.youtube.pendingCue;

  if (
    pending &&
    typeof pending.resolve ===
      'function'
  ) {
    pending.resolve(
      false
    );
  }

  state.youtube.pendingCue =
    null;
}

function cancelCountdown() {
  state.countdownRunId += 1;

  cancelPendingCue();

  removeCountdown();
}

function renderTrackInfo(
  data
) {
  const el =
    document.getElementById(
      'now-playing'
    );

  if (!el) {
    return;
  }

  el.innerHTML =
    `🎧 ${data.artists} - ` +
    `<a class="no-favicon" href="${data.trackLink}" target="_blank" rel="noopener noreferrer">${data.name}</a>` +
    ` | <span id="progress-time">${formatTime(
      getSpotifyProgressMs()
    )}</span>/${data.duration}`;
}

function setSpotifyClock(
  data,
  requestStart,
  requestEnd
) {
  const rawProgress =
    Number(
      data.progressMs ??
        parseTimeToSeconds(
          data.progress
        ) * 1000
    ) || 0;

  const serverTime =
    Number(
      data.serverTime
    ) || 0;

  let progressNow =
    rawProgress;

  if (serverTime) {
    const midpoint =
      (
        requestStart +
        requestEnd
      ) / 2;

    const age =
      midpoint -
      serverTime;

    if (
      age >= -1000 &&
      age <= 10000
    ) {
      progressNow =
        rawProgress +
        Math.max(0, age);
    }
  }

  if (data.durationMs) {
    progressNow =
      Math.min(
        progressNow,
        Number(
          data.durationMs
        )
      );
  }

  state.progressMs =
    Math.max(
      0,
      progressNow
    );

  state.serverTime =
    serverTime;

  state.progressAnchorMs =
    state.progressMs;

  state.progressAnchorPerformance =
    performance.now();
}

function getSpotifyProgressMs() {
  if (!state.trackData) {
    return state.progressMs;
  }

  if (!state.isPlaying) {
    return state.progressMs;
  }

  if (
    !state.progressAnchorPerformance
  ) {
    return state.progressMs;
  }

  let progress =
    state.progressAnchorMs +
    (
      performance.now() -
      state.progressAnchorPerformance
    );

  if (state.durationMs) {
    progress =
      Math.min(
        progress,
        state.durationMs
      );
  }

  return Math.max(
    0,
    progress
  );
}

function getYouTubeTargetSeconds() {
  return (
    getSpotifyProgressMs() /
    1000
  );
}

function render() {
  if (!state.trackData) {
    return;
  }

  const timeEl =
    document.getElementById(
      'progress-time'
    );

  if (timeEl) {
    timeEl.textContent =
      formatTime(
        getSpotifyProgressMs()
      );
  }

  if (!state.lyricsData) {
    return;
  }

  const front =
    document.getElementById(
      'front'
    );

  if (
    state.lyricsData.error
  ) {
    if (front) {
      front.textContent =
        state.lyricsData.error;
    }

    return;
  }

  const lyric =
    getCurrentLyric(
      state.lyricsData.lines,
      getSpotifyProgressMs()
    ) || '...';

  triggerLyricAnimation(
    lyric
  );
}

function createYouTubeContainer() {
  let container =
    document.getElementById(
      'youtube-background-player'
    );

  if (container) {
    return container;
  }

  container =
    document.createElement(
      'div'
    );

  container.id =
    'youtube-background-player';

  container.className =
    'youtube-background-player';

  document.body.appendChild(
    container
  );

  return container;
}

function loadYouTubeAPI() {
  if (
    window.YT &&
    window.YT.Player
  ) {
    return Promise.resolve(
      window.YT
    );
  }

  if (
    state.youtube.apiPromise
  ) {
    return state.youtube.apiPromise;
  }

  state.youtube.apiPromise =
    new Promise(
      (
        resolve,
        reject
      ) => {
        const previousReady =
          window.onYouTubeIframeAPIReady;

        window.onYouTubeIframeAPIReady =
          () => {
            try {
              if (
                typeof previousReady ===
                'function'
              ) {
                previousReady();
              }
            } catch {}

            resolve(
              window.YT
            );
          };

        const existing =
          document.querySelector(
            'script[src="https://www.youtube.com/iframe_api"]'
          );

        if (existing) {
          return;
        }

        const script =
          document.createElement(
            'script'
          );

        script.src =
          'https://www.youtube.com/iframe_api';

        script.async =
          true;

        script.onerror =
          () => {
            reject(
              new Error(
                'YouTube IFrame API yüklenemedi.'
              )
            );
          };

        document.head.appendChild(
          script
        );
      }
    );

  return state.youtube.apiPromise;
}

function handleYouTubeStateChange(
  event
) {
  const player =
    state.youtube.player;

  if (!player) {
    return;
  }

  if (
    event.data ===
    YT.PlayerState.CUED
  ) {
    const pending =
      state.youtube.pendingCue;

    if (!pending) {
      return;
    }

    if (
      pending.sequence !==
      state.youtube.cueSequence
    ) {
      return;
    }

    state.youtube.cuedSequence =
      pending.sequence;

    const resolve =
      pending.resolve;

    state.youtube.pendingCue =
      null;

    if (
      typeof resolve ===
      'function'
    ) {
      resolve(true);
    }

    return;
  }

  if (
    event.data ===
    YT.PlayerState.ENDED
  ) {
    pollTrack(true);
  }
}

async function ensureYouTubePlayer() {
  if (
    state.youtube.player &&
    state.youtube.ready
  ) {
    return state.youtube.player;
  }

  await loadYouTubeAPI();

  if (
    state.youtube.player &&
    state.youtube.ready
  ) {
    return state.youtube.player;
  }

  const container =
    createYouTubeContainer();

  return new Promise(
    (
      resolve,
      reject
    ) => {
      try {
        state.youtube.player =
          new YT.Player(
            container,
            {
              width: '200',
              height: '200',

              playerVars: {
                autoplay: 0,
                controls: 0,
                disablekb: 1,
                fs: 0,
                iv_load_policy: 3,
                playsinline: 1,
                rel: 0,
                origin:
                  window.location.origin
              },

              events: {
                onReady:
                  (event) => {
                    state.youtube.ready =
                      true;

                    resolve(
                      event.target
                    );
                  },

                onStateChange:
                  handleYouTubeStateChange,

                onError:
                  () => {}
              }
            }
          );
      } catch (error) {
        reject(error);
      }
    }
  );
}

async function cueYouTubeTrack(
  videoId
) {
  const player =
    await ensureYouTubePlayer();

  if (!player) {
    return false;
  }

  const normalizedId =
    String(
      videoId || ''
    ).trim();

  if (!normalizedId) {
    return false;
  }

  cancelPendingCue();

  const sequence =
    ++state.youtube.cueSequence;

  state.youtube.videoId =
    normalizedId;

  state.youtube.cuedSequence =
    0;

  const cuePromise =
    new Promise(
      (resolve) => {
        state.youtube.pendingCue = {
          videoId:
            normalizedId,
          sequence,
          resolve
        };
      }
    );

  try {
    player.pauseVideo();

    player.cueVideoById({
      videoId:
        normalizedId,
      startSeconds:
        getYouTubeTargetSeconds()
    });
  } catch {
    cancelPendingCue();
    return false;
  }

  return cuePromise;
}

async function startMusicSequence() {
  if (
    state.musicChoice !==
      'yes' ||
    !state.trackData?.videoId ||
    !state.isPlaying ||
    state.countdownActive
  ) {
    return;
  }

  const runId =
    ++state.countdownRunId;

  state.countdownActive =
    true;

  const countdown =
    createCountdown();

  if (!countdown) {
    state.countdownActive =
      false;

    return;
  }

  const videoId =
    String(
      state.trackData.videoId
    ).trim();

  let cuePromise;

  try {
    cuePromise =
      cueYouTubeTrack(
        videoId
      );
  } catch {
    removeCountdown();
    return;
  }

  for (
    const value of [
      '3',
      '2',
      '1'
    ]
  ) {
    if (
      runId !==
        state.countdownRunId ||
      !state.isPlaying ||
      state.musicChoice !==
        'yes' ||
      !state.trackData?.videoId
    ) {
      removeCountdown();
      return;
    }

    if (
      String(
        state.trackData.videoId
      ).trim() !==
      videoId
    ) {
      removeCountdown();
      return;
    }

    countdown.textContent =
      value;

    await new Promise(
      (resolve) => {
        setTimeout(
          resolve,
          1000
        );
      }
    );
  }

  if (
    runId !==
    state.countdownRunId
  ) {
    removeCountdown();
    return;
  }

  const cued =
    await cuePromise;

  if (
    runId !==
      state.countdownRunId ||
    !cued ||
    !state.isPlaying ||
    state.musicChoice !==
      'yes'
  ) {
    removeCountdown();
    return;
  }

  if (
    !state.trackData?.videoId ||
    String(
      state.trackData.videoId
    ).trim() !==
    videoId
  ) {
    removeCountdown();
    return;
  }

  removeCountdown();

  syncYouTube(true);
}

async function syncYouTube(
  force = false
) {
  if (
    state.youtube.syncInFlight
  ) {
    return;
  }

  if (
    state.musicChoice !==
      'yes' ||
    state.countdownActive ||
    !state.trackData?.videoId
  ) {
    if (
      !state.isPlaying &&
      state.youtube.player
    ) {
      try {
        state.youtube.player.pauseVideo();
      } catch {}
    }

    return;
  }

  state.youtube.syncInFlight =
    true;

  try {
    const player =
      state.youtube.player;

    if (
      !player ||
      !state.youtube.ready
    ) {
      return;
    }

    const videoId =
      String(
        state.trackData.videoId
      ).trim();

    const targetSeconds =
      getYouTubeTargetSeconds();

    if (
      state.youtube.videoId !==
      videoId
    ) {
      return;
    }

    if (!state.isPlaying) {
      try {
        player.pauseVideo();
      } catch {}

      return;
    }

    const playerState =
      player.getPlayerState();

    if (
      playerState ===
        YT.PlayerState.UNSTARTED ||
      playerState ===
        YT.PlayerState.CUED ||
      playerState ===
        YT.PlayerState.PAUSED ||
      playerState ===
        YT.PlayerState.ENDED
    ) {
      player.seekTo(
        targetSeconds,
        true
      );

      player.playVideo();

      return;
    }

    if (
      playerState !==
      YT.PlayerState.PLAYING
    ) {
      player.seekTo(
        targetSeconds,
        true
      );

      player.playVideo();

      return;
    }

    const currentSeconds =
      player.getCurrentTime();

    const driftMs =
      (
        currentSeconds -
        targetSeconds
      ) * 1000;

    if (
      Math.abs(driftMs) >
      SYNC_CORRECTION_MS
    ) {
      player.seekTo(
        targetSeconds,
        true
      );

      return;
    }

    if (force) {
      player.seekTo(
        targetSeconds,
        true
      );
    }
  } catch {
  } finally {
    state.youtube.syncInFlight =
      false;
  }
}

function updateMusicState(
  previousPlaying
) {
  if (!state.trackData) {
    removeMusicPrompt();
    cancelCountdown();

    return;
  }

  if (!state.isPlaying) {
    removeMusicPrompt();
    cancelCountdown();

    if (
      state.youtube.player
    ) {
      try {
        state.youtube.player.pauseVideo();
      } catch {}
    }

    return;
  }

  if (
    state.musicChoice ===
      null &&
    !state.musicPromptShown
  ) {
    createMusicPrompt();
  }

  if (
    state.musicChoice ===
      'yes' &&
    !previousPlaying
  ) {
    startMusicSequence();
  }
}

async function applyPayload(
  data,
  requestStart,
  requestEnd
) {
  ensureLyricsCube();

  if (
    !data ||
    data.error
  ) {
    Object.assign(
      state,
      {
        trackData:
          null,
        lastTrackLink:
          '',
        lyricsData:
          null,
        currentLyricText:
          '',
        pendingLyricText:
          null,
        isPlaying:
          false
      }
    );

    removeMusicPrompt();
    cancelCountdown();

    if (
      state.youtube.player
    ) {
      try {
        state.youtube.player.pauseVideo();
      } catch {}
    }

    const el =
      document.getElementById(
        'now-playing'
      );

    if (el) {
      el.textContent =
        data?.error ||
        'bir şeyler ters gitti.';
    }

    const front =
      document.getElementById(
        'front'
      );

    if (front) {
      front.textContent =
        '';
    }

    return;
  }

  const previousTrack =
    state.lastTrackLink;

  const previousPlaying =
    state.isPlaying;

  state.trackData =
    data;

  state.isPlaying =
    Boolean(
      data.isPlaying
    );

  state.durationMs =
    Number(
      data.durationMs
    ) ||
    parseTimeToSeconds(
      data.duration
    ) * 1000;

  setSpotifyClock(
    data,
    requestStart,
    requestEnd
  );

  const trackChanged =
    data.trackLink !==
    previousTrack;

  if (trackChanged) {
    if (
      state.countdownActive
    ) {
      cancelCountdown();
    }

    const token =
      ++state.lyricsToken;

    if (state.lyricsAbort) {
      state.lyricsAbort.abort();
    }

    state.lastTrackLink =
      data.trackLink;

    state.lyricsData =
      null;

    state.currentLyricText =
      '';

    state.pendingLyricText =
      null;

    renderTrackInfo(
      data
    );

    const front =
      document.getElementById(
        'front'
      );

    const bottom =
      document.getElementById(
        'bottom'
      );

    if (front) {
      front.textContent =
        'yükleniyor...';
    }

    if (bottom) {
      bottom.textContent =
        '';
    }

    if (
      !state.isPlaying
    ) {
      removeMusicPrompt();
      cancelCountdown();

      if (
        state.youtube.player
      ) {
        try {
          state.youtube.player.pauseVideo();
        } catch {}
      }
    } else if (
      state.musicChoice ===
      null
    ) {
      createMusicPrompt();
    } else if (
      state.musicChoice ===
        'yes' &&
      data.videoId
    ) {
      startMusicSequence();
    }

    fetchLyrics(
      data
    ).then(
      (lyrics) => {
        if (
          token !==
          state.lyricsToken
        ) {
          return;
        }

        if (!lyrics) {
          return;
        }

        state.lyricsData =
          lyrics;

        render();
      }
    );

    return;
  }

  updateMusicState(
    previousPlaying
  );

  if (
    state.musicChoice ===
      'yes' &&
    state.isPlaying &&
    state.youtube.player &&
    !state.countdownActive
  ) {
    syncYouTube(
      false
    );
  }

  render();
}

async function pollTrack(
  force = false
) {
  if (state.pollInFlight) {
    state.pollAgain =
      true;

    return;
  }

  state.pollInFlight =
    true;

  const requestStart =
    Date.now();

  try {
    const data =
      await fetchJSON(
        POLL_URL
      );

    const requestEnd =
      Date.now();

    await applyPayload(
      data,
      requestStart,
      requestEnd
    );
  } catch {
    const el =
      document.getElementById(
        'now-playing'
      );

    if (el) {
      el.textContent =
        'bir şeyler ters gitti.';
    }
  } finally {
    state.pollInFlight =
      false;

    if (
      state.pollAgain
    ) {
      state.pollAgain =
        false;

      pollTrack(
        true
      );

      return;
    }

    setTimeout(
      () => {
        pollTrack(
          false
        );
      },
      force
        ? 250
        : POLL_MS
    );
  }
}

function uiTick() {
  render();
}

injectStyles();
ensureLyricsCube();

pollTrack(true);

setInterval(
  uiTick,
  100
);

setInterval(
  () => {
    if (
      state.musicChoice ===
        'yes' &&
      state.isPlaying &&
      state.youtube.player &&
      !state.countdownActive
    ) {
      syncYouTube(
        false
      );
    }
  },
  YOUTUBE_SYNC_MS
);

document.addEventListener(
  'visibilitychange',
  () => {
    if (document.hidden) {
      return;
    }

    pollTrack(true);

    if (
      state.musicChoice ===
        'yes' &&
      state.isPlaying &&
      state.youtube.player
    ) {
      syncYouTube(
        true
      );
    }
  }
);
