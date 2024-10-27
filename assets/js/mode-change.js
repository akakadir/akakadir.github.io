// change theme mode and save to cookie
function changeMode() {
    // detect body data-theme attribute
    let theme = document.body.getAttribute("data-theme");
    // on first load, check if user has a preference in cookie
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (theme === null) {
        theme = isDark ? "dark" : "light";
    }
    // toggle theme
    theme = theme === "dark" ? "light" : "dark";
    document.body.setAttribute("data-theme", theme);
    
    // change Utterances theme based on the selected mode
    const utterancesTheme = theme === "dark" ? "github-dark" : "github-light";
    setUtterancesTheme(utterancesTheme);

    // save theme preference to cookie for 1 year and set SameSite to all pages
    document.cookie = `theme=${theme}; max-age=31536000; SameSite=Lax; path=/`;
}

// Function to set Utterances theme
function setUtterancesTheme(theme) {
    const utterances = document.querySelector('iframe.utterances');
    if (utterances) {
        // iframe içindeki tema ayarını değiştirme
        const src = utterances.src;
        utterances.src = src.split('?')[0] + '?theme=' + theme;
    }
}

// add event load to check cookie for theme preference and set the theme
window.addEventListener("load", () => {
    // check if user has a preference in cookie
    const theme = getCookie("theme");
    if (theme) {
        document.body.setAttribute("data-theme", theme);
        // Set Utterances theme based on cookie value
        const utterancesTheme = theme === "dark" ? "github-dark" : "github-light";
        setUtterancesTheme(utterancesTheme);
    }
});

// auto change theme based on data-theme attribute
function autoChangeMode() {
    // detect body data-theme attribute
    let theme = document.body.getAttribute("data-theme");
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (theme === null) {
        theme = isDark ? "dark" : "light";
    }
    // Set Utterances theme accordingly
    const utterancesTheme = theme === "dark" ? "github-dark" : "github-light";
    setUtterancesTheme(utterancesTheme);
}

// get cookie by name
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
        return parts.pop().split(";").shift();
    }
}

// make it priority to load before other scripts
document.addEventListener("DOMContentLoaded", function () {
    // add event listener to mode button
    document.getElementById("mode").addEventListener("click", changeMode);
    // add event listener to auto change mode
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", autoChangeMode);
});
