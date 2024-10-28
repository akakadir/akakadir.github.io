// change theme mode and save to cookie
function changeMode() {
    let theme = document.body.getAttribute("data-theme");
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (theme === null) {
        theme = isDark ? "dark" : "light";
    }
    theme = theme === "dark" ? "light" : "dark";
    document.body.setAttribute("data-theme", theme);
    document.cookie = `theme=${theme}; max-age=31536000; SameSite=Lax; path=/`;
    
    // Tema değişimi sırasında utterances'ı güncelle
    setTheme(theme);
}

// get cookie by name
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
        return parts.pop().split(";").shift();
    }
}

// auto change theme based data-theme attribute
function autoChangeMode() {
    let theme = document.body.getAttribute("data-theme");
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (theme === null) {
        theme = isDark ? "dark" : "light";
    }
    setTheme(theme);
}

// make it priority to load before other scripts
document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("mode").addEventListener("click", changeMode);
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", autoChangeMode);

    // Sayfa yüklendiğinde mevcut temayı kontrol et
    const theme = getCookie("theme");
    document.body.setAttribute("data-theme", theme || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
    autoChangeMode(); // Temayı otomatik olarak ayarla
});

// Theme management
function setTheme(theme) {
    const lightDiv = document.getElementById('utterances-light');
    const darkDiv = document.getElementById('utterances-dark');

    if (theme === 'dark') {
        lightDiv.style.display = 'none';
        darkDiv.style.display = 'block';
    } else {
        lightDiv.style.display = 'block';
        darkDiv.style.display = 'none';
    }
}
