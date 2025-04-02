function changeMode(theme) {
    document.body.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
    updateGiscusTheme(theme);
}

function updateGiscusTheme(theme) {
    const giscusTheme = theme === "dark" 
        ? "https://akakadir.github.io/assets/css/giscus_dark.css" 
        : "https://akakadir.github.io/assets/css/giscus_light.css";

    const iframe = document.querySelector("iframe.giscus-frame");
    if (iframe) {
        iframe.contentWindow.postMessage(
            { giscus: { setConfig: { theme: giscusTheme } } },
            "https://giscus.app"
        );
    }
}

function applyThemeOnLoad() {
    const theme = localStorage.getItem("theme") || "light";
    document.body.setAttribute("data-theme", theme);
    updateGiscusTheme(theme);
}

function monitorGiscus() {
    const iframe = document.querySelector("iframe.giscus-frame");
    if (iframe) {
        const theme = document.body.getAttribute("data-theme");
        updateGiscusTheme(theme);
        iframe.onload = function () {
            updateGiscusTheme(theme);
        };
    }
}

document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("mode")?.addEventListener("click", () => changeMode("light"));
    document.getElementById("mode2")?.addEventListener("click", () => changeMode("dark"));
    applyThemeOnLoad();
    monitorGiscus();
});

window.addEventListener("message", (event) => {
    if (event.origin === "https://giscus.app") {
        const theme = document.body.getAttribute("data-theme");
        updateGiscusTheme(theme);
    }
});

setInterval(() => {
    const iframe = document.querySelector("iframe.giscus-frame");
    const currentTheme = document.body.getAttribute("data-theme");
    if (iframe) {
        updateGiscusTheme(currentTheme);
    }
}, 3000);
