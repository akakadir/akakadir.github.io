function changeMode() {
    let theme = document.body.getAttribute("data-theme");
    theme = theme === "dark" ? "light" : "dark";
    document.body.setAttribute("data-theme", theme);
    safeSetItem("theme", theme);
    updateGiscusTheme(theme);
}

function updateGiscusTheme(theme) {
    const giscusTheme = theme === "dark" 
        ? "https://akakadir.github.io/assets/css/giscus_dark.css" 
        : "https://akakadir.github.io/assets/css/giscus_light.css";

    const iframe = document.querySelector("iframe.giscus-frame");
    if (iframe) {
        try {
            iframe.contentWindow.postMessage(
                { giscus: { setConfig: { theme: giscusTheme } } },
                "https://giscus.app"
            );
        } catch (error) {
            console.error("Giscus temasını güncelleyemedi:", error);
        }
    }
}

function applyThemeOnLoad() {
    const theme = safeGetItem("theme", "light");
    document.body.setAttribute("data-theme", theme);
    updateGiscusTheme(theme);
}

function monitorGiscus() {
    const observer = new MutationObserver(() => {
        const iframe = document.querySelector("iframe.giscus-frame");
        if (iframe) {
            const theme = document.body.getAttribute("data-theme");
            updateGiscusTheme(theme);
            iframe.onload = function () {
                updateGiscusTheme(theme);
            };
            observer.disconnect();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

function safeSetItem(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch (error) {
        console.warn("localStorage kullanılamıyor:", error);
    }
}

function safeGetItem(key, defaultValue) {
    try {
        return localStorage.getItem(key) || defaultValue;
    } catch (error) {
        console.warn("localStorage kullanılamıyor:", error);
        return defaultValue;
    }
}

document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("mode")?.addEventListener("click", () => changeMode());
    applyThemeOnLoad();
    monitorGiscus();
});
