function changeMode() {
    let theme = document.body.getAttribute("data-theme");
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (theme === null) {
        theme = isDark ? "dark" : "light";
    }
    theme = theme === "dark" ? "light" : "dark";
    document.body.setAttribute("data-theme", theme);
    document.cookie = `theme=${theme}; max-age=31536000; SameSite=Lax; path=/`;
    
    setTheme(theme);
}

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
        return parts.pop().split(";").shift();
    }
}

function autoChangeMode() {
    let theme = document.body.getAttribute("data-theme");
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (theme === null) {
        theme = isDark ? "dark" : "light";
    }
    setTheme(theme);
}

document.addEventListener("DOMContentLoaded", function () {
    const theme = getCookie("theme") || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.body.setAttribute("data-theme", theme);
    setTheme(theme); // Hemen tema ayarlarını yap
    autoChangeMode(); // Otomatik mod ayarları

    document.getElementById("mode").addEventListener("click", changeMode);
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", autoChangeMode);
});

function setTheme(theme) {
    const lightDiv = document.getElementById('utterances-light');
    const darkDiv = document.getElementById('utterances-dark');

    // Tema ayarlarına göre görünürlüğü ayarlayın
    if (theme === 'dark') {
        lightDiv.style.display = 'none';
        darkDiv.style.display = 'block';
        darkDiv.style.visibility = 'visible'; // Hızla görünür yap
        lightDiv.style.visibility = 'hidden'; // Gizle
    } else {
        lightDiv.style.display = 'block';
        darkDiv.style.display = 'none';
        lightDiv.style.visibility = 'visible'; // Hızla görünür yap
        darkDiv.style.visibility = 'hidden'; // Gizle
    }
}

// Tema değiştirme butonu için ikon ayarlama
const button = document.getElementById('mode');
const icon = document.getElementById('mode-text');
let toggle = true;

button.addEventListener('click', () => {
    toggle = !toggle;
    icon.textContent = toggle ? '◐' : '◑';
});
