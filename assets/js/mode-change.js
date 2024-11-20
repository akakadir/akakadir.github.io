function changeGiscusTheme() {
    const theme = document.body.getAttribute('data-theme') === 'dark' ? 'https://akakadir.github.io/assets/css/giscus_dark.css' : 'https://akakadir.github.io/assets/css/giscus_light.css';
    const language = getCookie("language") || "tr";  // Dil parametresini çerezden al, varsayılan olarak 'tr'

    function sendMessage(message) {
        const iframe = document.querySelector('iframe.giscus-frame');
        if (!iframe) return console.error('Giscus yüklenemedi!');

        iframe.contentWindow.postMessage({ giscus: message }, 'https://giscus.app');
    }

    sendMessage({ setConfig: { theme: theme, language: language } });
    document.cookie = `giscusTheme=${theme}; max-age=31536000; SameSite=Lax; path=/`;
    document.cookie = `giscusLanguage=${language}; max-age=31536000; SameSite=Lax; path=/`;  // Giscus dilini çerezde sakla
}

function checkThemeOnLoad() {
    const theme = getCookie("theme");
    if (theme) {
        document.body.setAttribute("data-theme", theme);
    } else {
        const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        document.body.setAttribute("data-theme", isDark ? "dark" : "light");
    }

    const giscusTheme = getCookie("giscusTheme");
    if (giscusTheme) {
        changeGiscusTheme();
    } else {
        changeGiscusTheme();
    }

    const giscusLanguage = getCookie("giscusLanguage");
    if (giscusLanguage) {
        document.querySelector('iframe.giscus-frame').setAttribute('data-language', giscusLanguage);
    }
}

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
        return parts.pop().split(";").shift();
    }
}

document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("mode").addEventListener("click", changeMode);
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", changeMode);
});

window.addEventListener("load", () => {
    checkThemeOnLoad();
    initGiscus();
});

window.addEventListener("message", (event) => {
    if (event.origin === "https://giscus.app") {
        changeGiscusTheme();
    }
});
