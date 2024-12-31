function changeMode() {
    let theme = document.body.getAttribute("data-theme");

    // Kullanıcı tercihlerine göre tema değiştir
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
        // Varsayılan olarak light temaya ayarlayabiliriz
        document.body.setAttribute("data-theme", "light");
    }

    // Giscus temasını localStorage'dan kontrol et ve uygula
    if (giscusTheme) {
        const iframe = document.querySelector('iframe.giscus-frame');
        if (iframe) {
            iframe.contentWindow.postMessage({ giscus: { setConfig: { theme: giscusTheme } } }, 'https://giscus.app');
        }
    } else {
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
});

window.addEventListener("load", () => {
    checkThemeOnLoad();  // Sayfa yüklendiğinde temayı kontrol et ve ayarla
    initGiscus();        // Giscus'ü başlat
});
