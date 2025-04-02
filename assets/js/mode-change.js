function setLightMode() {
    document.body.setAttribute("data-theme", "light");
    localStorage.setItem("theme", "light");
    updateGiscusTheme("light");
}

function setDarkMode() {
    document.body.setAttribute("data-theme", "dark");
    localStorage.setItem("theme", "dark");
    updateGiscusTheme("dark");
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
        } catch (e) {}
    }
}

function applyThemeOnLoad() {
    const theme = localStorage.getItem("theme") || "light";
    document.body.setAttribute("data-theme", theme);
    updateGiscusTheme(theme);
}

function monitorGiscus() {
    const observer = new MutationObserver(function(mutations) {
        const iframe = document.querySelector("iframe.giscus-frame");
        if (iframe) {
            const theme = document.body.getAttribute("data-theme");
            updateGiscusTheme(theme);
        }
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
}

document.addEventListener("DOMContentLoaded", function() {
    const modeBtn = document.getElementById("mode");
    const mode2Btn = document.getElementById("mode2");
    
    if (modeBtn) {
        modeBtn.addEventListener("click", function(e) {
            e.preventDefault();
            setLightMode();
        });
    }
    
    if (mode2Btn) {
        mode2Btn.addEventListener("click", function(e) {
            e.preventDefault();
            setDarkMode();
        });
    }
    
    applyThemeOnLoad();
    monitorGiscus();
});

window.addEventListener("message", function(event) {
    if (event.origin === "https://giscus.app") {
        const theme = document.body.getAttribute("data-theme");
        updateGiscusTheme(theme);
    }
});
