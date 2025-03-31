document.addEventListener('DOMContentLoaded', () => {
  if (!localStorage.getItem('cookieConsent')) {
    document.getElementById('cookie-banner').style.display = 'block';
  }
});

function setCookie(name, value, days) {
  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value}; expires=${date.toUTCString()}; path=/`;
}

function getCurrentTimestamp() {
  const date = new Date();
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(2);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

document.getElementById('accept-cookies').addEventListener('click', () => {
  localStorage.setItem('cookieConsent', 'accepted');

  const userAgent = navigator.userAgent;
  const colorScheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  const timestamp = getCurrentTimestamp();
  const screenWidth = window.screen.width;
  const screenHeight = window.screen.height;
  const language = navigator.language;
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const onlineStatus = navigator.onLine ? 'online' : 'offline';
  const platform = navigator.platform;
  const touchSupport = navigator.maxTouchPoints > 0 ? 'yes' : 'no';

  setCookie('device-info', userAgent, 365);
  setCookie('color-scheme', colorScheme, 365);
  setCookie('visit-timestamp', timestamp, 365);
  setCookie('screen-width', screenWidth, 365);
  setCookie('screen-height', screenHeight, 365);
  setCookie('language', language, 365);
  setCookie('time-zone', timeZone, 365);
  setCookie('online-status', onlineStatus, 365);
  setCookie('platform', platform, 365);
  setCookie('touch-support', touchSupport, 365);

  document.body.classList.add('cookie-created');
  document.getElementById('cookie-banner').style.display = 'none';
});

document.getElementById('reject-cookies').addEventListener('click', () => {
  localStorage.setItem('cookieConsent', 'rejected');
  document.getElementById('cookie-banner').style.display = 'none';
});

document.getElementById('cookie-close').addEventListener('click', () => {
  document.getElementById('cookie-banner').style.display = 'none';
});
