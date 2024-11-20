function changeGiscusTheme() {
  const theme = document.body.getAttribute("data-theme") === 'dark' ? 'dark' : 'light';

  const iframe = document.querySelector('iframe.giscus-frame');
  if (!iframe) return;

  iframe.contentWindow.postMessage(
    { giscus: { setConfig: { theme: theme } } },
    'https://giscus.app'
  );
}

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop().split(";").shift();
  }
}

function setCookie(name, value) {
  document.cookie = `${name}=${value}; max-age=31536000; SameSite=Lax; path=/`;
}

function setThemeFromCookie() {
  const theme = getCookie("theme");
  if (theme) {
    document.body.setAttribute("data-theme", theme);
  } else {
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.body.setAttribute("data-theme", isDark ? "dark" : "light");
  }
  changeGiscusTheme();
}

const modeToggle = document.getElementsByClassName("mode-toggle")[0];

if (modeToggle) {
  modeToggle.addEventListener('click', () => {
    const currentTheme = document.body.getAttribute("data-theme");
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.body.setAttribute("data-theme", newTheme);
    setCookie("theme", newTheme);
    changeGiscusTheme();
  });
}

window.addEventListener("load", setThemeFromCookie);
