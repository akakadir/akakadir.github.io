// Giscus'u dinamik olarak yükleme
let giscusLoading = false;

function loadGiscus() {
    if (giscusLoading) return;
    giscusLoading = true;

    const container = document.getElementById('giscus-container');
    if (container) {
        container.innerHTML = ''; // Mevcut içeriği temizle
    }

    // Giscus script'ini oluştur
    const script = document.createElement('script');
    script.src = "https://giscus.app/client.js";
    script.setAttribute("data-repo", "akakadir/akakadir.github.io");
    script.setAttribute("data-repo-id", "R_kgDOMseKEw");
    script.setAttribute("data-category", "General");
    script.setAttribute("data-category-id", "DIC_kwDOMseKE84Cj2AA");
    script.setAttribute("data-mapping", "title");
    script.setAttribute("data-strict", "0");
    script.setAttribute("data-reactions-enabled", "0");
    script.setAttribute("data-emit-metadata", "0");
    script.setAttribute("data-input-position", "top");
    script.setAttribute("data-theme", "https://akakadir.github.io/assets/css/giscus_light.css");
    script.setAttribute("data-lang", "tr");
    script.setAttribute("data-loading", "lazy");
    script.setAttribute("crossorigin", "anonymous");
    script.setAttribute("async", "");

    script.onload = () => {
        giscusLoading = false;
        updateGiscusTheme(document.body.getAttribute("data-theme")); // Giscus yüklenince tema güncelle
    };

    script.onerror = () => {
        giscusLoading = false;
        console.error("Giscus yüklenirken bir hata oluştu.");
    };

    container.appendChild(script);
}

// Tema değiştirme fonksiyonu
function changeMode() {
    let theme = document.body.getAttribute("data-theme");
    theme = theme === "dark" ? "light" : "dark";
    document.body.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
    updateGiscusTheme(theme); // Tema değiştiğinde Giscus'un temasını güncelle
}

// Giscus'un temasını güncelleme
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

// Sayfa yüklendiğinde ve gezinme sırasında Giscus'u kontrol et
function applyThemeOnLoad() {
    const theme = localStorage.getItem("theme") || "light";
    document.body.setAttribute("data-theme", theme);
    updateGiscusTheme(theme);
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

// Giscus'un iframe'inin yüklenmesini bekle
function waitForIframeAndUpdateTheme() {
    const iframe = document.querySelector('iframe.giscus-frame');
    if (iframe) {
        const theme = document.body.getAttribute('data-theme');
        updateGiscusTheme(theme);
    } else {
        // Eğer iframe henüz yüklenmediyse, belirli aralıklarla kontrol et
        setTimeout(waitForIframeAndUpdateTheme, 500);
    }
}

document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("mode")?.addEventListener("click", () => changeMode());
    applyThemeOnLoad();
    waitForIframeAndUpdateTheme(); // iframe'in yüklendiğini bekleyerek tema güncellemesi yap
});

window.addEventListener("pageshow", () => loadGiscus()); // Sayfada gezinme (back/forward) olduğunda Giscus'u yükle

// Giscus iframe'inin yüklenip yüklenmediğini kontrol et
setInterval(() => {
    if (!document.querySelector('iframe.giscus-frame')) {
        loadGiscus(); // Eğer iframe yoksa, tekrar yükle
    }
}, 3000);
