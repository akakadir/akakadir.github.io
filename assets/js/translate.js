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
        let prevSibling = element.previousSibling;
        let nextSibling = element.nextSibling;

        if (prevSibling && prevSibling.nodeType === 3 && /[a-zA-Z0-9]/.test(prevSibling.textContent.trim()) && !/\s$/.test(prevSibling.textContent)) {
            prevSibling.textContent = prevSibling.textContent.trim() + ' ';
        }

        if (nextSibling && nextSibling.nodeType === 3 && /[a-zAZ0-9]/.test(nextSibling.textContent.trim()) && !/^\s/.test(nextSibling.textContent)) {
            nextSibling.textContent = ' ' + nextSibling.textContent.trim();
        }

        if (prevSibling && prevSibling.nodeType === 3) {
            let prevText = prevSibling.textContent.trim();
            if (prevText.length > 0 && !/\s$/.test(prevText)) {
                prevSibling.textContent = prevText + ' ';
            }
        }

        if (nextSibling && nextSibling.nodeType === 3) {
            let nextText = nextSibling.textContent.trim();
            if (nextText.length > 0 && !/^\s/.test(nextText)) {
                nextSibling.textContent = ' ' + nextText;
            }
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
