function separateWordsInCode() {
    const codeElements = document.querySelectorAll('code');

    codeElements.forEach(codeElement => {
        let textContent = codeElement.textContent;
        let separatedText = textContent.split(' ').map(word => {
            return `<span>${word}</span>`;
        }).join(' ');

        codeElement.innerHTML = separatedText;
    });
}

function googleTranslateElementInit() {
    new google.translate.TranslateElement({ includedLanguages: 'tr,en,de,fr,es' }, 'translate');
    isLoading = false;
    separateWordsInCode();
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

document.addEventListener('DOMContentLoaded', () => {
    separateWordsInCode();
});
