function changeMode() {
    let currentTheme = document.body.getAttribute("data-theme");
    let newTheme = currentTheme === "dark" ? "light" : "dark";
    
    document.body.setAttribute("data-theme", newTheme);
    document.cookie = `theme=${newTheme}; max-age=31536000; SameSite=Lax; path=/`;
    
    setTheme(newTheme);
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
    
    // Otomatik tema değiştirme
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (event) => {
        const newTheme = event.matches ? "dark" : "light";
        document.body.setAttribute("data-theme", newTheme);
        setTheme(newTheme);
    });
});
