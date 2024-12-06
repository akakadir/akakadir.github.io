// Tema modunu değiştir ve localStorage'da sakla
function changeMode() {
    let theme = document.body.getAttribute("data-theme");
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (theme === null) {
        theme = isDark ? "dark" : "light";
    }

    // Tema değiştirme
    theme = theme === "dark" ? "light" : "dark";
    document.body.setAttribute("data-theme", theme);
    
    // LocalStorage'da sakla
    localStorage.setItem("theme", theme);

    // Giscus temasını güncelle
    changeGiscusTheme(theme);
}

// Giscus teması güncelleme
function changeGiscusTheme(theme) {
    const giscusTheme = theme === 'dark' ? 'https://akakadir.github.io/assets/css/giscus_dark.css' : 'https://akakadir.github.io/assets/css/giscus_light.css';
    const iframe = document.querySelector('iframe.giscus-frame');
    
    // İframe'i bulup Giscus temasını güncelleme
    if (iframe) {
        try {
            iframe.contentWindow.postMessage({
                giscus: {
                    setConfig: {
                        theme: giscusTheme
                    }
                }
            }, 'https://giscus.app');
            // Giscus temasını localStorage'a kaydet
            localStorage.setItem('giscusTheme', giscusTheme);
        } catch (error) {
            console.error("Giscus iframe güncellenemedi", error);
        }
    }
}

// Sayfa yüklendiğinde tema ayarlarını kontrol et
window.addEventListener("load", () => {
    // LocalStorage'dan tema bilgisi al
    const theme = localStorage.getItem("theme") || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.body.setAttribute("data-theme", theme);

    // Giscus temasını yükle
    changeGiscusTheme(theme);

    // Eğer Giscus iframe'i varsa, temayı yeniden güncelle
    const iframe = document.querySelector('iframe.giscus-frame');
    if (iframe) {
        iframe.onload = () => {
            // Giscus iframe'i yüklendiğinde, tema güncelleme
            changeGiscusTheme(theme);
        }
    }
});

// Auto-change mode fonksiyonu, cihaz tema tercihini takip eder
function autoChangeMode() {
    const theme = document.body.getAttribute("data-theme");
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (theme === null) {
        document.body.setAttribute("data-theme", isDark ? "dark" : "light");
    }
    // Giscus temasını otomatik güncelle
    changeGiscusTheme(document.body.getAttribute("data-theme"));
}

// DOMContentLoaded olayı ile tema butonuna tıklama olayını dinleyin
document.addEventListener("DOMContentLoaded", function () {
    // Tema değiştirme butonuna event listener ekleyin
    document.getElementById("mode").addEventListener("click", changeMode);

    // Cihazın tema değişimini takip etmek için
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", autoChangeMode);
});
