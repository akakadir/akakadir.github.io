let isLoading = false, debounceTimer;

function googleTranslateElementInit() {
    new google.translate.TranslateElement({ includedLanguages: 'tr,en,de,fr,es' }, 'translate');
    isLoading = false;
}

function resetGoogleTranslate() {
    if (isLoading) return;
    isLoading = true;

    const translateElement = document.getElementById('translate');
    translateElement.innerHTML = "";

    const existingScript = document.getElementById('google-translate-script');
    if (existingScript) {
        existingScript.remove();
    }
    const script = document.createElement('script');
    script.id = 'google-translate-script';
    script.src = `https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit&ts=${Date.now()}`;
    script.onload = () => {
        script.defer = true;
        isLoading = false;
    };

    script.onerror = () => {
        isLoading = false;
        console.error("Google Çeviri hatası.");
    };

    document.head.appendChild(script);
}

function resetGoogleTranslateDebounced() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(resetGoogleTranslate, 200);
}

function fixCodeTags() {
    const codeElements = document.querySelectorAll('code');
    codeElements.forEach(element => {
        const textContent = element.innerHTML.trim();
        if (/[a-zA-Z]/.test(textContent) && !/[^\w\s]/.test(textContent.slice(-1))) {
            element.innerHTML = textContent + ' ';
        }
    });
}

function handleTranslation() {
    fixCodeTags();
}

['DOMContentLoaded', 'pageshow', 'popstate'].forEach(event => {
    window.addEventListener(event, () => {
        resetGoogleTranslateDebounced();
        handleTranslation();
    });
});
