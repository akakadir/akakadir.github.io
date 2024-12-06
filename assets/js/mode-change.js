function changeMode() {
    const theme = document.body.getAttribute("data-theme") === 'dark' ? 'light' : 'dark';
    document.body.setAttribute("data-theme", theme);
    localStorage.setItem('theme', theme);
    document.cookie = `theme=${theme}; max-age=31536000; SameSite=Lax; path=/`;

    updateGiscusTheme(theme);
}

function updateGiscusTheme(theme) {
    const giscusTheme = theme === 'dark' ? 'https://akakadir.github.io/assets/css/giscus_dark.css' : 'https://akakadir.github.io/assets/css/giscus_light.css';
    const giscusScript = document.getElementById('giscus');
    if (giscusScript) giscusScript.setAttribute('data-theme', giscusTheme);
}

function loadTheme() {
    const theme = localStorage.getItem("theme") || (window.matchMedia("(prefers-color-scheme: dark)").matches ? 'dark' : 'light');
    document.body.setAttribute("data-theme", theme);
    updateGiscusTheme(theme);
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("mode")?.addEventListener("click", changeMode);
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", changeMode);
});

window.addEventListener("load", loadTheme);
