function changeMode() {
    let theme = document.body.getAttribute("data-theme");
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

    if (theme === null) {
        theme = isDark ? "dark" : "light";
    }

    theme = theme === "dark" ? "light" : "dark";
    document.body.setAttribute("data-theme", theme);
    document.cookie = `theme=${theme}; max-age=31536000; SameSite=Lax; path=/`;
    changeUtterancesTheme(); // Utterances temasını güncelle
}

function changeUtterancesTheme() {
    const theme = document.body.getAttribute('data-theme') === 'dark' ? 'github-dark' : 'github-light';

    const utterances = document.querySelector('script[src="https://utteranc.es/client.js"]');
    if (utterances) {
        utterances.setAttribute('data-theme', theme);
        // Refresh utterances comments
        const iframe = document.querySelector('iframe.utterances-frame');
        if (iframe) {
            iframe.contentWindow.postMessage({ type: 'set-theme', theme: theme }, '*');
        }
    } else {
        console.error('Utterances script bulunamadı.');
    }
}

function checkThemeOnLoad() {
    const theme = getCookie("theme");
    if (theme) {
        document.body.setAttribute("data-theme", theme);
    } else {
        const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        document.body.setAttribute("data-theme", isDark ? "dark" : "light");
    }
    changeUtterancesTheme();
}

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
        return parts.pop().split(";").shift();
    }
}

function initUtterances() {
    const utterances = document.querySelector('script[src="https://utteranc.es/client.js"]');
    if (utterances) {
        changeUtterancesTheme();
    } else {
        console.error('Utterances script henüz yüklenmedi.');
    }
}

document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("mode").addEventListener("click", changeMode);
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", changeMode);
});

window.addEventListener("load", () => {
    checkThemeOnLoad();
    initUtterances();
});
