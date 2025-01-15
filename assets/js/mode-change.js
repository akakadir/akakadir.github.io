// Tema değiştirme fonksiyonu
function changeMode() {
    let theme = document.body.getAttribute("data-theme");
    theme = theme === "dark" ? "light" : "dark"; // Temayı değiştir
    document.body.setAttribute("data-theme", theme); // Tema class'ını güncelle
    localStorage.setItem("theme", theme); // Tema ayarını kaydet
    updateGiscusTheme(theme); // Giscus teması güncelle
}

// Giscus'un temasını güncelleme
function updateGiscusTheme(theme) {
    const giscusTheme = theme === "dark" 
        ? "https://akakadir.github.io/assets/css/giscus_dark.css" 
        : "https://akakadir.github.io/assets/css/giscus_light.css";
    
    // iframe yüklendiyse, Giscus temasını güncelle
    const iframe = document.querySelector("iframe.giscus-frame");
    if (iframe) {
        iframe.contentWindow.postMessage(
            { giscus: { setConfig: { theme: giscusTheme } } },
            "https://giscus.app"
        );
    }
}

// Sayfa yüklendiğinde tema ayarını al ve uygula
function applyThemeOnLoad() {
    const theme = localStorage.getItem("theme") || "light"; // Yerel depolamadan temayı al
    document.body.setAttribute("data-theme", theme); // Temayı uygula
    updateGiscusTheme(theme); // Giscus temasını uygula
}

// Giscus'u dinamik olarak yükleme
let giscusLoading = false;
function loadGiscus() {
    if (giscusLoading) return; // Eğer Giscus zaten yükleniyorsa, yeni bir yükleme yapma
    giscusLoading = true;

    const container = document.getElementById('giscus-container');
    if (container) {
        container.innerHTML = ''; // Mevcut içeriği temizle
    }

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
        updateGiscusTheme(document.body.getAttribute("data-theme")); // Tema değiştiğinde Giscus'u güncelle
    };

    script.onerror = () => {
        giscusLoading = false;
        console.error("Giscus yüklenirken bir hata oluştu.");
    };

    container.appendChild(script);
}

// Sayfa yüklendiğinde tema ve Giscus'u kontrol et
document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("mode")?.addEventListener("click", () => changeMode()); // Tema değiştirme butonuna tıklandığında
    applyThemeOnLoad(); // Sayfa yüklendiğinde tema ayarını uygula
    loadGiscus(); // Giscus'u yükle
});

// Giscus iframe'inin yüklenmesini bekle ve tema güncellemesi yap
function waitForIframeAndUpdateTheme() {
    const iframe = document.querySelector('iframe.giscus-frame');
    if (iframe) {
        const theme = document.body.getAttribute('data-theme');
        updateGiscusTheme(theme);
    } else {
        setTimeout(waitForIframeAndUpdateTheme, 500); // Eğer iframe henüz yüklenmemişse, 500ms sonra tekrar dene
    }
}

// Periyodik kontrol (iOS için güvenlik önlemi)
setInterval(() => {
    if (!document.querySelector('iframe.giscus-frame')) {
        loadGiscus(); // Eğer iframe yoksa, tekrar yükle
    }
}, 3000);
