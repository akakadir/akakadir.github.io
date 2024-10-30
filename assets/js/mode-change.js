// change theme mode and save to cookie
function changeMode() {
    // detect body data-theme attribute
    let theme = document.body.getAttribute("data-theme");
    // toggle theme
    theme = theme === "dark" ? "light" : "dark";
    document.body.setAttribute("data-theme", theme);
    // save theme preference to cookie for 1 year and set SameSite to all pages
    document.cookie = `theme=${theme}; max-age=31536000; SameSite=Lax; path=/`;
}

// auto change theme based on user's preference and cookie
function autoChangeMode() {
    let theme = document.body.getAttribute("data-theme");
    // check if user has a preference in cookie
    const cookieTheme = getCookie("theme");
    if (cookieTheme) {
        theme = cookieTheme;
    } else {
        const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        theme = isDark ? "dark" : "light";
    }
    document.body.setAttribute("data-theme", theme);
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
    // set initial theme based on cookie or preference
    autoChangeMode();

    // add event listener to mode button
    document.getElementById("mode").addEventListener("click", changeMode);

    // add event listener to auto change mode
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", autoChangeMode);
});
