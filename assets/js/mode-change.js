function changeMode() {
    let theme = document.body.getAttribute("data-theme") === "dark" ? "light" : "dark";
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
    const theme = getCookie("theme") || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.body.setAttribute("data-theme", theme);
    setTheme(theme);

    document.getElementById("mode").addEventListener("click", changeMode);
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", autoChangeMode);
});

function autoChangeMode(event) {
    const theme = event.matches ? "dark" : "light";
    document.body.setAttribute("data-theme", theme);
    setTheme(theme);
}
