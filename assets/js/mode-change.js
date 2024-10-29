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
    icon.textContent = theme === 'dark' ? '◑' : '◐';
}

const button = document.getElementById('mode');
const icon = document.getElementById('mode-text');
let toggle = true;

button.addEventListener('click', () => {
    toggle = !toggle;
    changeMode();
});

window.addEventListener("load", () => {
    const theme = getCookie("theme");
    if (theme) {
        document.body.setAttribute("data-theme", theme);
        setTheme(theme);
        icon.textContent = theme === 'dark' ? '◑' : '◐';
    }
});

function autoChangeMode() {
    let theme = document.body.getAttribute("data-theme");
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (theme === null) {
        theme = isDark ? "dark" : "light";
    }

    setTheme(theme);
    icon.textContent = theme === 'dark' ? '◑' : '◐';
}

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
        return parts.pop().split(";").shift();
    }
}

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

document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("mode").addEventListener("click", changeMode);
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", autoChangeMode);
});
