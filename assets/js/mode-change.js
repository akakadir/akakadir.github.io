function changeMode() {
    let theme = document.body.getAttribute("data-theme");
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

    // İlk başta tema ayarlanmazsa, varsayılan olarak tercih edilen modda tema belirlenir
    if (theme === null) {
        theme = isDark ? "dark" : "light";
    }

    // Tema değiştiriliyor
    theme = theme === "dark" ? "light" : "dark";
    document.body.setAttribute("data-theme", theme);

    // Çerezde tema bilgisi saklanır
    document.cookie = `theme=${theme}; max-age=31536000; SameSite=Lax; path=/`;

    // Giscus temasını güncelle
    changeGiscusTheme(theme);
}

function changeGiscusTheme(theme) {
    // Tema URL'lerini belirle
    const darkThemeUrl = 'https://akakadir.github.io/assets/css/giscus_dark.css';
    const lightThemeUrl = 'https://akakadir.github.io/assets/css/giscus_light.css';

    // Eğer tema yoksa, mevcut tema üzerinden karar ver
    theme = theme || document.body.getAttribute('data-theme') === 'dark' ? darkThemeUrl : lightThemeUrl;

    // Giscus iframe'ine mesaj gönderme
    function sendMessage(message) {
        const iframe = document.querySelector('iframe.giscus-frame');
        if (!iframe) {
            console.error('Giscus iframe bulunamadı!');
            return;
        }

        // Mesajı gönder
        iframe.contentWindow.postMessage({ giscus: message }, 'https://giscus.app');
    }

    // Temayı güncelleme mesajını gönder
    sendMessage({ setConfig: { theme: theme } });
}

function checkThemeOnLoad() {
    // Çerezden tema bilgisini al
    const theme = getCookie("theme");
    if (theme) {
        document.body.setAttribute("data-theme", theme);
    } else {
        const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        document.body.setAttribute("data-theme", isDark ? "dark" : "light");
    }

    const currentTheme = document.body.getAttribute("data-theme");
    changeGiscusTheme(currentTheme);
}

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
        return parts.pop().split(";").shift();
    }
}

function initGiscus() {
    const iframe = document.querySelector('iframe.giscus-frame');
    if (iframe) {
        // Giscus iframe yüklendiğinde, mevcut tema ile güncelle
        iframe.onload = function () {
            const currentTheme = document.body.getAttribute("data-theme");
            changeGiscusTheme(currentTheme);
        };
    } else {
        console.error('Giscus iframe yüklenemedi!');
    }
}

document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("mode").addEventListener("click", changeMode);
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", changeMode);
});

window.addEventListener("load", () => {
    // Sayfa yüklendiğinde temayı kontrol et ve Giscus temasıyla güncelle
    checkThemeOnLoad();
    initGiscus();
});

// Giscus iframe'inden gelen mesajları dinle
window.addEventListener("message", (event) => {
    if (event.origin === "https://giscus.app") {
        // Giscus'tan gelen mesajı kontrol et
        changeGiscusTheme();
    }
});
