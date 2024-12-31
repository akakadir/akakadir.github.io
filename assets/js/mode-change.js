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
        iframe.contentWindow.postMessage(
            { giscus: { setConfig: { theme: giscusTheme } } },
            "https://giscus.app"
        );
        localStorage.setItem("giscusTheme", giscusTheme);  // Giscus teması localStorage'a kaydediliyor
    } else {
        console.error("Giscus iframe bulunamadı!");
    }
}

function checkThemeOnLoad() {
    const theme = localStorage.getItem("theme") || "light"; // Varsayılan tema açık (light)
    document.body.setAttribute("data-theme", theme);

    // Giscus temasını güncelle
    const iframe = document.querySelector('iframe.giscus-frame');
    if (iframe) {
        iframe.onload = function () {
            iframe.contentWindow.postMessage(
                { giscus: { setConfig: { theme: theme === "dark" ? "https://akakadir.github.io/assets/css/giscus_dark.css" : "https://akakadir.github.io/assets/css/giscus_light.css" } } },
                "https://giscus.app"
            );
        };
    } else {
        console.error("Giscus iframe bulunamadı!");
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
        console.error("Giscus yüklenemedi!");
    }
}

document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("mode")?.addEventListener("click", () => changeMode());
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
