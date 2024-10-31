// Tema değiştirme ve çerezde kaydetme fonksiyonu
function changeMode() {
    let theme = document.body.getAttribute("data-theme");
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

    if (theme === null) {
        theme = isDark ? "dark" : "light";
    }

    theme = theme === "dark" ? "light" : "dark";
    document.body.setAttribute("data-theme", theme);
    document.cookie = `theme=${theme}; max-age=31536000; SameSite=Lax; path=/`;
    changeGiscusTheme(); // Giscus temasını güncelle
}

// Giscus temasını değiştirme fonksiyonu
function changeGiscusTheme() {
    const theme = document.body.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';

    function sendMessage(message) {
        const iframe = document.querySelector('iframe.giscus-frame');
        if (!iframe) return console.error('Giscus iframe bulunamadı.');

        // Mesajı gönder
        iframe.contentWindow.postMessage({ giscus: message }, 'https://giscus.app');
    }

    sendMessage({ setConfig: { theme: theme } });
}

// Sayfa yüklendiğinde tema ayarlarını kontrol et
function checkThemeOnLoad() {
    const theme = getCookie("theme");
    if (theme) {
        document.body.setAttribute("data-theme", theme);
    } else {
        const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        document.body.setAttribute("data-theme", isDark ? "dark" : "light");
    }
    changeGiscusTheme(); // İlk tema ayarını Giscus'a gönder
}

// Çerezden değer alma fonksiyonu
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
        return parts.pop().split(";").shift();
    }
}

// Giscus iframe'i yüklendikten sonra tema değişimini sağla
function initGiscus() {
    const iframe = document.querySelector('iframe.giscus-frame');
    if (iframe) {
        changeGiscusTheme();
    } else {
        console.error('Giscus iframe henüz yüklenmedi.');
    }
}

// DOMContentLoaded olayı ile başlangıç ayarlarını yap
document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("mode").addEventListener("click", changeMode);
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", changeMode);
});

// Sayfa yüklendiğinde tema kontrolü yap
window.addEventListener("load", () => {
    checkThemeOnLoad(); // Tema kontrolü
    initGiscus(); // Giscus'u başlat
});

// Giscus iframe yüklendiğinde temayı güncelle
window.addEventListener("message", (event) => {
    if (event.origin === "https://giscus.app") {
        // Giscus iframe yüklenip mesaj alındığında temayı kontrol et
        changeGiscusTheme();
    }
});
