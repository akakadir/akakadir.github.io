// Açık mod için fonksiyon
function setLightMode() {
    document.body.setAttribute("data-theme", "light");
    localStorage.setItem("theme", "light");
    updateGiscusTheme("light");
    console.log("Açık mod etkinleştirildi");
}

// Koyu mod için fonksiyon
function setDarkMode() {
    document.body.setAttribute("data-theme", "dark");
    localStorage.setItem("theme", "dark");
    updateGiscusTheme("dark");
    console.log("Koyu mod etkinleştirildi");
}

// Giscus tema güncellemesi için fonksiyon
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

// Sayfa yüklendiğinde temayı uygulama
function applyThemeOnLoad() {
    const theme = localStorage.getItem("theme") || "light";
    document.body.setAttribute("data-theme", theme);
    updateGiscusTheme(theme);
}

// Giscus iframe'ini izleme
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

// Event listener'ları ekleme
document.addEventListener("DOMContentLoaded", function () {
    const lightModeBtn = document.getElementById("mode");
    const darkModeBtn = document.getElementById("mode2");
    
    if (lightModeBtn) {
        lightModeBtn.addEventListener("click", function(e) {
            e.preventDefault();
            setLightMode();
        });
    }
    
    if (darkModeBtn) {
        darkModeBtn.addEventListener("click", function(e) {
            e.preventDefault();
            setDarkMode();
        });
    }
    
    applyThemeOnLoad();
    monitorGiscus();
});

// Giscus'tan gelen mesajları dinleme
window.addEventListener("message", (event) => {
    if (event.origin === "https://giscus.app") {
        const theme = document.body.getAttribute("data-theme");
        updateGiscusTheme(theme);
    }
});

// Giscus'u düzenli olarak kontrol etme
setInterval(() => {
    const iframe = document.querySelector("iframe.giscus-frame");
    if (iframe) {
        const currentTheme = document.body.getAttribute("data-theme");
        updateGiscusTheme(currentTheme);
    }
}, 3000);
