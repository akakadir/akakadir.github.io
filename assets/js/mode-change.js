function changeMode() {
    const theme = document.body.getAttribute("data-theme") === 'dark' ? 'light' : 'dark';
    document.body.setAttribute("data-theme", theme);
    localStorage.setItem('theme', theme);
    document.cookie = `theme=${theme}; max-age=31536000; SameSite=Lax; path=/`;

    changeGiscusTheme(theme);
}

function changeGiscusTheme(theme) {
    const giscusTheme = theme === 'dark' ? 'https://akakadir.github.io/assets/css/giscus_dark.css' : 'https://akakadir.github.io/assets/css/giscus_light.css';
    const iframe = document.querySelector('iframe.giscus-frame');
    if (iframe) {
        iframe.contentWindow.postMessage({ giscus: { setConfig: { theme: giscusTheme } } }, 'https://giscus.app');
        localStorage.setItem('giscusTheme', giscusTheme);
        document.cookie = `giscusTheme=${giscusTheme}; max-age=31536000; SameSite=Lax; path=/`;
    }
}

function checkThemeOnLoad() {
    const theme = localStorage.getItem("theme") || (window.matchMedia("(prefers-color-scheme: dark)").matches ? 'dark' : 'light');
    document.body.setAttribute("data-theme", theme);
    const giscusTheme = localStorage.getItem("giscusTheme") || (theme === 'dark' ? 'https://akakadir.github.io/assets/css/giscus_dark.css' : 'https://akakadir.github.io/assets/css/giscus_light.css');
    
    const iframe = document.querySelector('iframe.giscus-frame');
    if (iframe) {
        iframe.contentWindow.postMessage({ giscus: { setConfig: { theme: giscusTheme } } }, 'https://giscus.app');
    }
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("mode")?.addEventListener("click", () => changeMode());
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", changeMode);
});

window.addEventListener("load", checkThemeOnLoad);
