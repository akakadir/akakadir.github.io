// Tema değiştirme ve çerezde kaydetme fonksiyonu
function changeMode() {
    // Mevcut tema değerini al
    let theme = document.body.getAttribute("data-theme");
    // Kullanıcı tercihini kontrol et
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (theme === null) {
        theme = isDark ? "dark" : "light";
    }
    // Temayı değiştir
    theme = theme === "dark" ? "light" : "dark";
    document.body.setAttribute("data-theme", theme);
    // Temayı çerezde kaydet
    document.cookie = `theme=${theme}; max-age=31536000; SameSite=Lax; path=/`;

    changeGiscusTheme(); // Giscus temasını güncelle
}

// Giscus temasını değiştirme fonksiyonu
function changeGiscusTheme() {
    const theme = document.body.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';

    function sendMessage(message) {
        const iframe = document.querySelector('iframe'); // Giscus iframe'ini bul
        if (!iframe) {
            console.error('Giscus iframe bulunamadı.');
            return;
        }
        iframe.contentWindow.postMessage({ giscus: message }, 'https://giscus.app');
    }

    sendMessage({
        setConfig: {
            theme: theme
        }
    });
}

// Sayfa yüklendiğinde tema ayarlarını kontrol et
window.addEventListener("load", () => {
    const theme = getCookie("theme");
    if (theme) {
        document.body.setAttribute("data-theme", theme);
    } else {
        // Varsayılan olarak tema ayarı
        const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        document.body.setAttribute("data-theme", isDark ? "dark" : "light");
    }
    changeGiscusTheme(); // İlk tema ayarını Giscus'a gönder
});

// Çerezden değer alma fonksiyonu
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
        return parts.pop().split(";").shift();
    }
}

// DOMContentLoaded olayı ile başlangıç ayarlarını yap
document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("mode").addEventListener("click", changeMode);
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", changeMode);
});
