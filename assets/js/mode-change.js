function changeMode() {
     let theme = document.body.getAttribute("data-theme");
     theme = theme === "dark" ? "light" : "dark";
     document.body.setAttribute("data-theme", theme);
     localStorage.setItem("theme", theme);
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
 
 function applyThemeOnLoad() {
     const theme = localStorage.getItem("theme") || "light";
     document.body.setAttribute("data-theme", theme);
     updateAyarMenu(theme);
     updateModeButton(theme);
 }
 
 document.addEventListener("DOMContentLoaded", function () {
     document.getElementById("mode")?.addEventListener("click", () => changeMode());
     applyThemeOnLoad();
 });

setInterval(() => {
    const theme = localStorage.getItem("theme") || "light";
    if (document.body.getAttribute("data-theme") !== theme) {
        document.body.setAttribute("data-theme", theme);
        updateAyarMenu(theme);
        updateModeButton(theme);
        if (iframe) {
            updateGiscusTheme(theme);
        }
    }
}, 3000);
