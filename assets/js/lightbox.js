function isYoutubeLink(url) {
    const match = url.match(/^(?:https?:\/\/)?(?:www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})(?:\S+)?$/);
    return match ? match[1] : false;
}

function isImageLink(url) {
    return /\.(jpg|jpeg|png|gif)$/i.test(url);
}

function isPdfLink(url) {
    return /\.pdf$/i.test(url);
}

function setGallery(el) {
    document.querySelectorAll('.gallery').forEach(e => e.classList.remove('gallery'));
    
    const container = el.closest('ul, p');
    if (!container) return;
    
    const links = container.querySelectorAll("a[class*='lightbox-']");
    const href = el.getAttribute('href');
    
    links.forEach(link => {
        link.classList.remove('current');
        if (link.getAttribute('href') === href) link.classList.add('current');
    });
    
    if (links.length > 1) {
        document.getElementById('lightbox').classList.add('gallery');
        links.forEach(link => link.classList.add('gallery'));
        
        const gallery = Array.from(document.querySelectorAll('a.gallery'));
        const currentIdx = gallery.findIndex(link => link.classList.contains('current'));
        const nextIdx = (currentIdx + 1) % gallery.length;
        const prevIdx = (currentIdx - 1 + gallery.length) % gallery.length;
        
        document.getElementById('next').onclick = () => gallery[nextIdx].click();
        document.getElementById('prev').onclick = () => gallery[prevIdx].click();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const lightbox = document.createElement('div');
    lightbox.id = 'lightbox';
    document.body.appendChild(lightbox);
    
    document.querySelectorAll('a').forEach(el => {
        const url = el.getAttribute('href');
        if (!url || el.classList.contains('no-lightbox')) return;
        
        const youtubeId = isYoutubeLink(url);
        if (youtubeId) {
            el.classList.add('lightbox-youtube');
            el.setAttribute('data-id', youtubeId);
        } else if (isImageLink(url)) {
            el.classList.add('lightbox-image');
            el.setAttribute('title', url.split('/').pop().split('.')[0]);
        } else if (isPdfLink(url)) {
            el.classList.add('lightbox-pdf');
            el.setAttribute('title', url.split('/').pop().split('.')[0]);
        }
    });
    
    lightbox.onclick = e => {
        if (e.target.id !== 'next' && e.target.id !== 'prev') {
            lightbox.innerHTML = '';
            lightbox.style.display = 'none';
        }
    };
    
    document.querySelectorAll('a.lightbox-youtube').forEach(el => {
        el.onclick = e => {
            e.preventDefault();
            lightbox.innerHTML = `<a id="close"></a><a id="next">&rsaquo;</a><a id="prev">&lsaquo;</a><div class="videoWrapperContainer"><div class="videoWrapper"><iframe src="https://www.youtube.com/embed/${el.getAttribute('data-id')}?autoplay=1&showinfo=0&rel=0"></iframe></div>`;
            lightbox.style.display = 'block';
            setGallery(el);
        };
    });
    
    document.querySelectorAll('a.lightbox-image').forEach(el => {
        el.onclick = e => {
            e.preventDefault();
            const href = el.getAttribute('href');
            const title = el.getAttribute('title');
            lightbox.innerHTML = `<a id="close"></a><a id="next">&rsaquo;</a><a id="prev">&lsaquo;</a><div class="img" style="background-image: url('${href}');" title="${title}"><img src="${href}" alt="${title}"></div><span>${title}</span>`;
            lightbox.style.display = 'block';
            setGallery(el);
        };
    });

    const setAppHeight = () => {
    document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
};
setAppHeight();
window.addEventListener('resize', setAppHeight);
    
    document.querySelectorAll('a.lightbox-pdf').forEach(el => {
        el.onclick = e => {
            e.preventDefault();
            const pdfUrl = el.getAttribute('href');
            const currentDomain = window.location.hostname;
            let linkDomain;
            
            try {
                linkDomain = new URL(pdfUrl, window.location.href).hostname;
            } catch(err) {
                linkDomain = currentDomain;
            }
            
            let viewerUrl;
            if (linkDomain === currentDomain || pdfUrl.startsWith('/') || pdfUrl.startsWith('./')) {
                const encodedUrl = encodeURIComponent(pdfUrl);
                viewerUrl = `https://mozilla.github.io/pdf.js/web/viewer.html?file=https://akakadir.github.io/${encodedUrl}`;
            } else {
                const absoluteUrl = new URL(pdfUrl, window.location.href).href;
                viewerUrl = `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(absoluteUrl)}`;
            }
            
            lightbox.innerHTML = `<a id="close"></a><a id="next">&rsaquo;</a><a id="prev">&lsaquo;</a><div class="pdfWrapperContainer"><div class="pdfWrapper"><iframe src="${viewerUrl}"></iframe></div></div>`;
            lightbox.style.display = 'block';
            setGallery(el);
        };
    });
});
