function changeMode() {
    let theme = document.body.getAttribute("data-theme");
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

    if (theme === null) {
        theme = isDark ? "dark" : "light";
    }

    theme = theme === "dark" ? "light" : "dark";
    document.body.setAttribute("data-theme", theme);
    document.cookie = `theme=${theme}; max-age=31536000; SameSite=Lax; path=/`;
    reloadUtterances(); // Utterances'ı yeniden yükle
}

function reloadUtterances() {
    const utterances = document.querySelector('script[src="https://utteranc.es/client.js"]');
    if (utterances) {
        const container = document.getElementById('utterances');
        if (container) {
            container.innerHTML = ''; // Eski içeriği temizle
            const newUtterances = document.createElement('script');
            newUtterances.setAttribute('src', 'https://utteranc.es/client.js');
            newUtterances.setAttribute('repo', 'akakadir/akakadir.github.io'); // Kendi GitHub reposunu ekle
            newUtterances.setAttribute('issue-term', 'title');
            newUtterances.setAttribute('theme', document.body.getAttribute('data-theme') === 'dark' ? 'github-dark' : 'github-light');
            newUtterances.setAttribute('crossorigin', 'anonymous');
            newUtterances.setAttribute('async', true);
            container.appendChild(newUtterances);
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
    reloadUtterances();
}

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
        return parts.pop().split(";").shift();
    }
}

document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("mode").addEventListener("click", changeMode);
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", changeMode);
});

window.addEventListener("load", () => {
    checkThemeOnLoad();
});
