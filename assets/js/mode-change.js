function changeMode() {
    let theme = document.body.getAttribute("data-theme");
    theme = theme === "dark" ? "light" : "dark";
    document.body.setAttribute("data-theme", theme);
    sessionStorage.setItem("theme", theme);
    updateGiscusTheme(theme);
    updateAyarMenu(theme);
    updateModeButton(theme);
}

function updateModeButton(theme) {
    const modeButton = document.getElementById("mode");
    if (modeButton) {
        modeButton.textContent = theme === "dark" ? "karanlık" : "aydınlık";
        if (theme === "dark") {
            modeButton.classList.add("btn-inverse");
        } else {
            modeButton.classList.remove("btn-inverse");
        }
    }
}

function updateAyarMenu(theme) {
    const MenuButton = document.getElementById("ayarmenu");
    if (MenuButton) {
        if (theme === "dark") {
            MenuButton.classList.add("btn-inverse");
        } else {
            MenuButton.classList.remove("btn-inverse");
        }
    }
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
    const theme = sessionStorage.getItem("theme") || "light";
    document.body.setAttribute("data-theme", theme);
    updateGiscusTheme(theme);
    updateAyarMenu(theme);
    updateModeButton(theme);
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
    document.getElementById("mode")?.addEventListener("click", () => changeMode());
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
