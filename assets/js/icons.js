document.addEventListener("DOMContentLoaded", function () {
  const currentHost = window.location.hostname;

  document.querySelectorAll("a[href]").forEach(link => {
    let href = link.getAttribute("href");
    let faviconUrl;

    if (!href) return;

    if (href.startsWith("mailto:")) {
      faviconUrl = "/assets/img/png/formail.png";
    } else if (href.toLowerCase().endsWith(".pdf")) {
      faviconUrl = "/assets/img/png/forpdf.png";
    } else if (href.toLowerCase().endsWith(".png")) {
      faviconUrl = "/assets/img/png/forimg.png";
    } else if (href.startsWith("http://") || href.startsWith("https://")) {
      const url = new URL(href);
      const hostname = url.hostname;

      if (hostname === "github.com") {
        faviconUrl = "/assets/img/png/github.png";
      } else if (hostname === "files.catbox.moe") {
        faviconUrl = "/assets/img/png/forimg.png";
      } else if (hostname !== currentHost) {
        faviconUrl = `https://www.google.com/s2/favicons?domain=${hostname}&sz=256`;
      }
    }

    if (faviconUrl) {
      const img = document.createElement("img");
      img.src = faviconUrl;
      img.className = "favicon";
      img.setAttribute("width", "13");
      img.setAttribute("height", "13");
      img.style.cssText = `
        width: 13px !important;
        height: 13px !important;
        object-fit: contain !important;
        vertical-align: middle !important;
        display: inline-block !important;
        margin-left: 4px !important;
      `;

      link.classList.add("favicon-link");
      link.appendChild(img);
    }
  });
});

