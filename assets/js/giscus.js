let giscusLoading = false;

function isIOS() {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function loadGiscus() {
    if (giscusLoading) return;
    giscusLoading = true;

    const container = document.getElementById('giscus-container');
    if (container) {
        container.innerHTML = '';
    }

    const script = document.createElement('script');
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
    script.setAttribute("data-theme", "https://akakadir.github.io/assets/css/giscus_light.css");
    script.setAttribute("data-lang", "tr");
    script.setAttribute("data-loading", "lazy");
    script.setAttribute("crossorigin", "anonymous");
    script.setAttribute("async", "");

    script.onload = () => {
        giscusLoading = false;
    };

    script.onerror = () => {
        giscusLoading = false;
        console.error("Giscus yüklenirken bir hata oluştu.");
    };

    container.appendChild(script);
}

function iosFix() {
    if (isIOS()) {
        setTimeout(() => {
            const iframe = document.querySelector('iframe.giscus-frame');
            if (!iframe) {
                loadGiscus();
            }
        }, 800);
    }
}

['DOMContentLoaded', 'pageshow', 'popstate'].forEach(event => {
    window.addEventListener(event, () => {
        loadGiscus();
        iosFix();
    });
});

setInterval(() => {
    if (isIOS()) {
        const iframe = document.querySelector('iframe.giscus-frame');
        if (!iframe) {
            loadGiscus();
        }
    }
}, 3000);
