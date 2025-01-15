function loadGiscus() {
    const existingIframe = document.querySelector("iframe.giscus-frame");
    if (existingIframe) {
        existingIframe.remove();
    }

    const giscusContainer = document.getElementById("giscus-container");
    giscusContainer.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://giscus.app/client.js";
    script.setAttribute("data-repo", "akakadir/akakadir.github.io");
    script.setAttribute("data-repo-id", "R_kgDOMseKEw");
    script.setAttribute("data-category", "General");
    script.setAttribute("data-category-id", "DIC_kwDOMseKE84Cj2AA");
    script.setAttribute("data-mapping", "title");
    script.setAttribute("data-strict", "0");
    script.setAttribute("data-reactions-enabled", "0");
    script.setAttribute("data-emit-metadata", "0");
    script.setAttribute("data-input-position", "top");
    script.setAttribute(
        "data-theme",
        getGiscusTheme()
    );
    script.setAttribute("data-lang", "tr");
    script.setAttribute("data-loading", "lazy");
    script.setAttribute("crossorigin", "anonymous");
    script.setAttribute("async", "");

    giscusContainer.appendChild(script);
}

function changeMode() {
    let theme = document.body.getAttribute("data-theme");
    theme = theme === "dark" ? "light" : "dark";
    document.body.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);

    loadGiscus();
}

function getGiscusTheme() {
    const theme = document.body.getAttribute("data-theme") || "light";
    return theme === "dark"
        ? "https://akakadir.github.io/assets/css/giscus_dark.css"
        : "https://akakadir.github.io/assets/css/giscus_light.css";
}

function applyThemeOnLoad() {
    const savedTheme = localStorage.getItem("theme") || "light";
    document.body.setAttribute("data-theme", savedTheme);
    loadGiscus();
}

document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("mode")?.addEventListener("click", changeMode);
    applyThemeOnLoad();
});
