const yatranslate = {
    lang: "tr"
};

document.addEventListener('DOMContentLoaded', function () {
    yaTranslateInit();
    const select = document.getElementById('translate');
    if (select) {
        select.value = yaTranslateGetCode();
        select.addEventListener('change', function () {
            yaTranslateSetLang(this.value);
            yaTranslateHtmlHandler(this.value);
        });
    }
});

function yaTranslateInit() {
    if (yatranslate.langFirstVisit && !localStorage.getItem('yt-widget')) {
        yaTranslateSetLang(yatranslate.langFirstVisit);
    }

    let script = document.createElement('script');
    script.src = `https://translate.yandex.net/website-widget/v1/widget.js?widgetId=ytWidget&pageLang=${yatranslate.lang}&widgetTheme=light&autoMode=false`;
    document.getElementsByTagName('head')[0].appendChild(script);

    let code = yaTranslateGetCode();
    yaTranslateHtmlHandler(code);

    yaTranslateEventHandler('click', '[data-ya-lang]', function (el) {
        yaTranslateSetLang(el.getAttribute('data-ya-lang'));
        yaTranslateHtmlHandler(el.getAttribute('data-ya-lang'));
    });
}

function yaTranslateSetLang(lang) {
    localStorage.setItem('yt-widget', JSON.stringify({
        "lang": lang,
        "active": true
    }));
}

function yaTranslateGetCode() {
    return (localStorage["yt-widget"] != undefined && JSON.parse(localStorage["yt-widget"]).lang != undefined)
        ? JSON.parse(localStorage["yt-widget"]).lang
        : yatranslate.lang;
}

function yaTranslateHtmlHandler(code) {
    const activeLangElement = document.querySelector(`[data-ya-lang="${code}"]`);
    if (activeLangElement) {
        activeLangElement.remove();
    }
    document.querySelector('[data-lang-active]').textContent = code;
}

function yaTranslateEventHandler(event, selector, handler) {
    document.addEventListener(event, function (e) {
        let el = e.target.closest(selector);
        if (el) handler(el);
    });
}
