document.addEventListener("DOMContentLoaded", function() {
    let t = window.location.hostname;
    document.querySelectorAll("a[href]").forEach(e => {
        let i = e.getAttribute("href"),
            s;
        if (i) {
            if (i.startsWith("mailto:")) s = "/assets/img/png/formail.png";
            else if (i.toLowerCase().endsWith(".pdf")) s = "/assets/img/png/forpdf.png";
            else if (i.toLowerCase().endsWith(".png")) s = "/assets/img/png/forimg.png";
            else if (i.startsWith("http://") || i.startsWith("https://")) {
                let n = new URL(i),
                    a = n.hostname;
                "github.com" === a ? s = "/assets/img/png/github.png" : "twitter.com" === a || "x.com" === a ? s = "/assets/img/png/twitter.png" : "files.catbox.moe" === a ? s = "/assets/img/png/forimg.png" : a !== t && (s = `https://www.google.com/s2/favicons?domain=${a}&sz=256`)
            }
            if (s) {
                let o = document.createElement("img");
                o.src = s, o.className = "favicon", o.setAttribute("width", "13"), o.setAttribute("height", "13"), o.style.cssText = `
        width: 13px !important;
        height: 13px !important;
        object-fit: contain !important;
        vertical-align: middle !important;
        display: inline-block !important;
        margin-left: 4px !important;
      `, e.classList.add("favicon-link"), e.appendChild(o)
            }
        }
    })
});
