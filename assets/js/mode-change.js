function changeMode() {
    let theme = document.body.getAttribute("data-theme");
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

    if (theme === null) {
        theme = isDark ? "dark" : "light";
    }

    theme = theme === "dark" ? "light" : "dark";
    document.body.setAttribute("data-theme", theme);
    document.cookie = `theme=${theme}; max-age=31536000; SameSite=Lax; path=/`;

    changeGiscusTheme();
}

function changeGiscusTheme() {
    const theme = document.body.getAttribute('data-theme') === 'dark' ? 'https://akakadir.github.io/assets/css/giscus_dark.css' : 'https://akakadir.github.io/assets/css/giscus_light.css';

    // Giscus iframe'inin temayı hemen güncellemeye çalışalım
    const iframe = document.querySelector('iframe.giscus-frame');
    if (iframe) {
        iframe.contentWindow.postMessage({ giscus: { setConfig: { theme: theme } } }, 'https://giscus.app');
        document.cookie = `giscusTheme=${theme}; max-age=31536000; SameSite=Lax; path=/`; // Çerez güncelleme
    } else {
        console.error('Giscus iframe bulunamadı!');
    }
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
        // Giscus teması çerezden alınıp doğru tema uygulanacak
        changeGiscusTheme();
    } else {
        // Giscus teması çereze kaydedilmemişse, sayfa temasına göre Giscus temasını ayarla
        changeGiscusTheme();
    }
}

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
        return parts.pop().split(";").shift();
    }
}

function initGiscus() {
    const iframe = document.querySelector('iframe.giscus-frame');
    if (iframe) {
        changeGiscusTheme();
    } else {
        console.error('Giscus yüklenemedi!');
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
