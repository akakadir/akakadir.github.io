let giscusIsLoading = false;

function resetGiscus() {
    if (giscusIsLoading) return;

    giscusIsLoading = true;

    const container = document.getElementById('giscus-container');
    if (container) {
        container.innerHTML = '';
    }
  
    const existingIframe = document.querySelector('iframe.giscus-frame');
    if (existingIframe) {
        existingIframe.remove();
    }

    const script = document.getElementById('giscus-script');
    if (script) {
        const newScript = script.cloneNode(true);
        script.remove();
        document.body.appendChild(newScript);
    }

    giscusIsLoading = false;
}

['DOMContentLoaded', 'pageshow', 'popstate'].forEach(event => {
    window.addEventListener(event, resetGiscus);
});

setInterval(() => {
    const iframe = document.querySelector('iframe.giscus-frame');
    if (!iframe) {
        resetGiscus();
    }
}, 1000);
