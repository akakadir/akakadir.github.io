//smooth scroll improvement
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();

        document.querySelector(this.getAttribute('href')).scrollIntoView({
            behavior: 'smooth'
        });
    });
});
//dark switch
(function() {
  var v2 = document.getElementById("v2");
  if (v2) {
    initTheme();
    v2.addEventListener("change", function(event) {
      resetTheme();
    });
    function initTheme() {
      var v2Selected =
        localStorage.getItem("v2") !== null &&
        localStorage.getItem("v2") === "dark";
      v2.checked = v2Selected;
      v2Selected
        ? document.body.setAttribute("theme", "dark")
        : document.body.removeAttribute("theme");
    }
    function resetTheme() {
      if (v2.checked) {
        document.body.setAttribute("theme", "dark");
        localStorage.setItem("v2", "dark");
      } else {
        document.body.removeAttribute("theme");
        localStorage.removeItem("v2");
      }
    }
  }
})();
//switch sound
  var on = new Audio("cdn/sound/switch-on.mp3");
  var off = new Audio("cdn/sound/switch-off.mp3");
  
    var playlist = [off, on];
    var current = null;
    var idx = 0;

  function playSound() {

 if (current === null || current.ended) {
 current = playlist[idx++];

 if (idx >= playlist.length)
 idx = 0;
 current.currentTime=0;

 current.play();
 }
}