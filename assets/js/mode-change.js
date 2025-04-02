function changeMode(theme) {
    document.body.setAttribute("data-theme", theme);  // Sayfanın temasını değiştir
    localStorage.setItem("theme", theme);  // Yeni temayı localStorage'a kaydet
    updateGiscusTheme(theme);  // Giscus tema ayarını güncelle
}

function updateGiscusTheme(theme) {
    const giscusTheme = theme === "dark" 
        ? "https://akakadir.github.io/assets/css/giscus_dark.css" 
        : "https://akakadir.github.io/assets/css/giscus_light.css";

    const iframe = document.querySelector("iframe.giscus-frame");
    if (iframe) {
        iframe.contentWindow.postMessage(
            { giscus: { setConfig: { theme: giscusTheme } } },
            "https://giscus.app"
        );
    }
}

function applyThemeOnLoad() {
    // Sayfa yüklenirken localStorage'dan temayı al, varsayılan olarak 'light' teması kullan
    const theme = localStorage.getItem("theme") || "light";  // Varsayılan olarak 'light' teması
    document.body.setAttribute("data-theme", theme);  // Temayı uygula
    updateGiscusTheme(theme);  // Giscus tema ayarını uygula
}

function monitorGiscus() {
    const iframe = document.querySelector("iframe.giscus-frame");
    if (iframe) {
        const theme = document.body.getAttribute("data-theme");
        updateGiscusTheme(theme);
        iframe.onload = function () {
            updateGiscusTheme(theme);
        };
    }
}

document.addEventListener("DOMContentLoaded", function () {
    // Tema geçiş butonlarını ayarla
    document.getElementById("mode")?.addEventListener("click", () => changeMode("light"));  // Açık tema butonu
    document.getElementById("mode2")?.addEventListener("click", () => changeMode("dark"));  // Koyu tema butonu
    
    // Sayfa yüklendiğinde mevcut temayı uygula
    applyThemeOnLoad();
    monitorGiscus();
});

window.addEventListener("message", (event) => {
    if (event.origin === "https://giscus.app") {
        const theme = document.body.getAttribute("data-theme");
        updateGiscusTheme(theme);
    }
});

setInterval(() => {
    const iframe = document.querySelector("iframe.giscus-frame");
    const currentTheme = document.body.getAttribute("data-theme");
    if (iframe) {
        updateGiscusTheme(currentTheme);
    }
}, 3000);
