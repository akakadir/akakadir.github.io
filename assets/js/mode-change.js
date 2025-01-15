    let giscusLoading = false;

    // iOS cihazları tespit et
    function isIOS() {
        return /iPhone|iPad|iPod/i.test(navigator.userAgent);
    }

    // Giscus'u yükle
    function loadGiscus() {
        if (giscusLoading) return;
        giscusLoading = true;

        const container = document.getElementById('giscus-container');
        if (container) {
            container.innerHTML = ''; // Mevcut içeriği temizle
        }

        // Giscus script'ini oluştur
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
        script.setAttribute("data-theme", getGiscusTheme()); // Dinamik tema
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

    // Giscus teması güncelle
    function updateGiscusTheme(theme) {
        const giscusTheme = theme === "dark" 
            ? "https://akakadir.github.io/assets/css/giscus_dark.css" 
            : "https://akakadir.github.io/assets/css/giscus_light.css";

        const iframe = document.querySelector("iframe.giscus-frame");
        if (iframe) {
            iframe.contentWindow.postMessage(
                { giscus: { setConfig: { theme: giscusTheme } } },
                "https://giscus.app"
            );
        }
    }

    // Temayı değiştir
    function changeMode() {
        let theme = document.body.getAttribute("data-theme");
        theme = theme === "dark" ? "light" : "dark";
        document.body.setAttribute("data-theme", theme);
        localStorage.setItem("theme", theme);

        // Giscus teması için iframe'i güncelle
        updateGiscusTheme(theme);
    }

    // Sayfa yüklendiğinde temayı uygula
    function applyThemeOnLoad() {
        const theme = localStorage.getItem("theme") || "light";
        document.body.setAttribute("data-theme", theme);
        loadGiscus();
    }

    // iOS için özel kontrol
    function iosFix() {
        if (isIOS()) {
            setTimeout(() => {
                const iframe = document.querySelector('iframe.giscus-frame');
                if (!iframe) {
                    loadGiscus(); // Eğer iframe yoksa tekrar yükle
                }
            }, 500);
        }
    }

    // Tema durumunu al
    function getGiscusTheme() {
        const theme = document.body.getAttribute("data-theme") || "light";
        return theme === "dark"
            ? "https://akakadir.github.io/assets/css/giscus_dark.css"
            : "https://akakadir.github.io/assets/css/giscus_light.css";
    }

    // DOMContentLoaded sırasında yükleme
    document.addEventListener("DOMContentLoaded", function () {
        document.getElementById("mode")?.addEventListener("click", changeMode);
        applyThemeOnLoad();
    });

    // Sayfa gezinme olayları için Giscus'u kontrol et
    ['DOMContentLoaded', 'pageshow', 'popstate'].forEach(event => {
        window.addEventListener(event, () => {
            loadGiscus();
            iosFix();
        });
    });

    // Periyodik kontrol (iOS için güvenlik önlemi)
    setInterval(() => {
        if (isIOS()) {
            const iframe = document.querySelector("iframe.giscus-frame");
            if (!iframe) {
                loadGiscus(); // Eğer iframe yoksa tekrar yükle
            }
        }
    }, 3000);
