function changeMode() {
    let theme = document.body.getAttribute("data-theme");
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

    if (theme === null) {
        theme = isDark ? "dark" : "light";
    }

    theme = theme === "dark" ? "light" : "dark";
    document.body.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);  // localStorage'a kaydediyoruz

    // Giscus temasını da güncelle
    changeGiscusTheme(theme);
}

function changeGiscusTheme(theme) {
    // Giscus tema URL'lerini belirle
    const giscusTheme = theme === 'dark' ? 'https://akakadir.github.io/assets/css/giscus_dark.css' : 'https://akakadir.github.io/assets/css/giscus_light.css';

    // Giscus iframe'ini bul ve temayı ayarla
    const iframe = document.querySelector('iframe.giscus-frame');
    if (iframe) {
        iframe.contentWindow.postMessage({ giscus: { setConfig: { theme: giscusTheme } } }, 'https://giscus.app');
        localStorage.setItem("giscusTheme", giscusTheme);  // Giscus teması localStorage'a kaydediliyor
    } else {
        console.error('Giscus iframe bulunamadı!');
    }
}

function checkThemeOnLoad() {
    // Sayfa temasını localStorage'dan kontrol et
    const theme = localStorage.getItem("theme");
    const giscusTheme = localStorage.getItem("giscusTheme");

    if (theme) {
        document.body.setAttribute("data-theme", theme);
    } else {
        const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        document.body.setAttribute("data-theme", isDark ? "dark" : "light");
    }

    // Giscus temasını localStorage'dan kontrol et ve uygula
    if (giscusTheme) {
        // Giscus temasını localStorage'dan ayarla
        const iframe = document.querySelector('iframe.giscus-frame');
        if (iframe) {
            iframe.contentWindow.postMessage({ giscus: { setConfig: { theme: giscusTheme } } }, 'https://giscus.app');
        }
    } else {
        // Giscus temasını varsayılan olarak ayarla
        const currentTheme = document.body.getAttribute("data-theme") === "dark" ? "dark" : "light";
        changeGiscusTheme(currentTheme);
    }
}

function initGiscus() {
    const iframe = document.querySelector('iframe.giscus-frame');
    if (iframe) {
        iframe.onload = function () {
            const currentTheme = document.body.getAttribute("data-theme") === "dark" ? "dark" : "light";
            changeGiscusTheme(currentTheme);
        };
    } else {
        console.error('Giscus yüklenemedi!');
    }
}

document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("mode")?.addEventListener("click", () => changeMode());
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", changeMode);
});

window.addEventListener("load", () => {
    checkThemeOnLoad();  // Sayfa yüklendiğinde temayı kontrol et ve ayarla
    initGiscus();        // Giscus'ü başlat
});

// Giscus'tan gelen mesajı dinleyerek temayı güncelle
window.addEventListener("message", (event) => {
    if (event.origin === "https://giscus.app") {
        const theme = document.body.getAttribute("data-theme");
        changeGiscusTheme(theme);
    }
});
