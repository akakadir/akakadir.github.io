function changeMode() {
    let theme = document.body.getAttribute("data-theme");

    // Sayfa temasını değiştirme
    theme = theme === "dark" ? "light" : "dark";
    document.body.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);  // Tema bilgisi localStorage'a kaydediliyor

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

    // Tema varsa, sayfada uygula
    if (theme) {
        document.body.setAttribute("data-theme", theme);
    } else {
        // Tema yoksa, varsayılan olarak açık (light) tema kullan
        document.body.setAttribute("data-theme", "light");
    }

    // Giscus temasını güncelle
    const giscusTheme = localStorage.getItem("giscusTheme");
    if (giscusTheme) {
        // Giscus temasını localStorage'dan ayarla
        const iframe = document.querySelector('iframe.giscus-frame');
        if (iframe) {
            iframe.contentWindow.postMessage({ giscus: { setConfig: { theme: giscusTheme } } }, 'https://giscus.app');
        }
    } else {
        // Giscus temasını varsayılan olarak ayarla
        const currentTheme = document.body.getAttribute("data-theme");
        changeGiscusTheme(currentTheme);
    }
}

function initGiscus() {
    const iframe = document.querySelector('iframe.giscus-frame');
    if (iframe) {
        iframe.onload = function () {
            const currentTheme = document.body.getAttribute("data-theme");
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
