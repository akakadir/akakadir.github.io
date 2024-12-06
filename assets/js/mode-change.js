function changeMode() {
    let theme = document.body.getAttribute("data-theme");
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

    if (theme === null) {
        theme = isDark ? "dark" : "light";
    }

    theme = theme === "dark" ? "light" : "dark";
    document.body.setAttribute("data-theme", theme);
    document.cookie = `theme=${theme}; max-age=31536000; SameSite=Lax; path=/`;

    changeGiscusTheme();
}

function changeGiscusTheme() {
    const theme = document.body.getAttribute('data-theme') === 'dark' ? 'https://akakadir.github.io/assets/css/giscus_dark.css' : 'https://akakadir.github.io/assets/css/giscus_light.css';

    const iframe = document.querySelector('iframe.giscus-frame');
    if (iframe) {
        iframe.contentWindow.postMessage({ giscus: { setConfig: { theme: theme } } }, 'https://giscus.app');
        document.cookie = `giscusTheme=${theme}; max-age=31536000; SameSite=Lax; path=/`;
    } else {
        console.error('Giscus iframe bulunamadı!');
    }
}

function checkThemeOnLoad() {
    const theme = getCookie("theme");
    if (theme) {
        document.body.setAttribute("data-theme", theme);
    } else {
        const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        document.body.setAttribute("data-theme", isDark ? "dark" : "light");
    }

    const giscusTheme = getCookie("giscusTheme");
    if (giscusTheme) {
        const iframe = document.querySelector('iframe.giscus-frame');
        if (iframe) {
            iframe.contentWindow.postMessage({ giscus: { setConfig: { theme: giscusTheme } } }, 'https://giscus.app');
        }
    } else {
        changeGiscusTheme();
    }
}

function getCookie(name) {
    const cookieValue = document.cookie
        .split('; ')
        .find(row => row.startsWith(`${name}=`))
        ?.split('=')[1];
    return cookieValue ? decodeURIComponent(cookieValue) : null;
}

function initGiscus() {
    const iframe = document.querySelector('iframe.giscus-frame');
    if (iframe) {
        iframe.onload = function() {
            changeGiscusTheme();
        };
    } else {
        console.error('Giscus yüklenemedi!');
        retryInitGiscus();  // Giscus iframe'i yüklenmediyse tekrar deneyelim
    }
}

// retry mekanizması ekledim
function retryInitGiscus() {
    let attempts = 0;
    const maxAttempts = 10;  // Maksimum 10 deneme
    const interval = setInterval(() => {
        const iframe = document.querySelector('iframe.giscus-frame');
        if (iframe && attempts < maxAttempts) {
            iframe.onload = function() {
                changeGiscusTheme();
            };
            clearInterval(interval);
        }
        if (attempts >= maxAttempts) {
            clearInterval(interval);
            console.error('Giscus iframe yüklendi ancak temayı değiştiremiyorum.');
        }
        attempts++;
    }, 500);  // Her yarım saniyede bir kontrol
}

document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("mode").addEventListener("click", changeMode);
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", changeMode);
});

window.addEventListener("load", () => {
    checkThemeOnLoad();
    initGiscus();
});

window.addEventListener("message", (event) => {
    // Mesajın doğru kaynaktan geldiğinden emin olun
    if (event.origin === "https://giscus.app") {
        changeGiscusTheme();
    } else {
        console.error("Güvenlik uyarısı: Yanlış kaynaktan gelen mesaj.");
    }
});
