<div id="giscus-container"></div>

<script>
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
        script.setAttribute("data-theme", getCurrentThemeURL()); // Tema linkini al
        script.setAttribute("data-lang", "tr");
        script.setAttribute("data-loading", "lazy");
        script.setAttribute("crossorigin", "anonymous");
        script.setAttribute("async", "");

        script.onload = () => {
            giscusLoading = false;
            updateGiscusTheme(); // Giscus teması yüklendikten sonra güncelle
        };

        script.onerror = () => {
            giscusLoading = false;
            console.error("Giscus yüklenirken bir hata oluştu.");
        };

        container.appendChild(script);
    }

    // Giscus'un temasını güncelle
    function updateGiscusTheme() {
        const iframe = document.querySelector("iframe.giscus-frame");
        if (iframe) {
            const theme = getCurrentThemeURL(); // Sayfa temasını al
            iframe.contentWindow.postMessage(
                { giscus: { setConfig: { theme: theme } } },
                "https://giscus.app"
            );
        }
    }

    // Sayfa teması URL'ini almak için yardımcı fonksiyon
    function getCurrentThemeURL() {
        const theme = document.body.getAttribute("data-theme") || "light"; // Varsayılan tema: "light"
        return theme === "dark" 
            ? "https://akakadir.github.io/assets/css/giscus_dark.css" 
            : "https://akakadir.github.io/assets/css/giscus_light.css";
    }

    // Sayfa temasını değiştir
    function changeMode() {
        let theme = document.body.getAttribute("data-theme");
        theme = theme === "dark" ? "light" : "dark"; // Temayı değiştir
        document.body.setAttribute("data-theme", theme); // Tema class'ını güncelle
        localStorage.setItem("theme", theme); // Tema ayarını kaydet
        updateGiscusTheme(); // Giscus temasını güncelle
    }

    // Sayfa yüklendiğinde tema ayarını al ve uygula
    function applyThemeOnLoad() {
        const theme = localStorage.getItem("theme") || "light"; // Yerel depolamadan temayı al
        document.body.setAttribute("data-theme", theme); // Temayı uygula
        updateGiscusTheme(); // Giscus temasını uygula
    }

    // Sayfa veya Giscus iframe'inin yüklenmesini kontrol et ve temayı güncelle
    function monitorGiscus() {
        const iframe = document.querySelector("iframe.giscus-frame");
        if (iframe) {
            updateGiscusTheme(); // iframe yüklendiyse, Giscus temasını güncelle
            iframe.onload = function () {
                updateGiscusTheme(); // iframe yüklendikten sonra temayı güncelle
            };
        } else {
            setTimeout(monitorGiscus, 500); // Eğer iframe yoksa, 500ms sonra tekrar dene
        }
    }

    // Sayfa yüklendiğinde Giscus ve tema kontrolü
    document.addEventListener("DOMContentLoaded", function () {
        applyThemeOnLoad(); // Sayfa yüklendiğinde temayı uygula
        loadGiscus(); // Giscus'u yükle
        monitorGiscus(); // Giscus'u dinamik olarak kontrol et
        document.getElementById("mode")?.addEventListener("click", changeMode); // Tema değiştirme butonuna tıklandığında
    });

    // Sayfada ileri-geri gezinme ve popstate olaylarına yanıt ver
    window.addEventListener("pageshow", function() {
        loadGiscus(); // Sayfa geri yüklenmişse, Giscus'u tekrar yükle
        updateGiscusTheme(); // Tema senkronize olsun
    });

    // Periyodik kontrol (iOS için güvenlik önlemi)
    setInterval(() => {
        const iframe = document.querySelector("iframe.giscus-frame");
        if (!iframe) {
            loadGiscus(); // Eğer iframe yoksa, tekrar yükle
        }
    }, 3000);
</script>
