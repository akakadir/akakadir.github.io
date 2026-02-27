document.addEventListener('DOMContentLoaded', () => {
    const link = document.querySelector('a[href$=".mp3"]');
    if (!link) return;

    const src = link.href;

    const wrapper = document.createElement('div');
    wrapper.className = 'player-wrapper';
    wrapper.innerHTML = `
        <div id="ppb" aria-hidden="true">
            <svg class="pi" id="pl" viewBox="0 0 14 16"><polygon points="0,0 14,8 0,16"/></svg>
            <svg class="pa" id="ps" viewBox="0 0 14 16"><rect x="0" width="4" height="16"/><rect x="10" width="4" height="16"/></svg>
        </div>
        <div id="prog">
            <div id="tt">0:00</div>
            <div id="pf"></div>
        </div>
        <div id="dt">0:00</div>
        <div id="vc">
            <svg id="vi" viewBox="0 0 24 24">
                <path d="M3 9v6h4l5 5V4L7 9H3z"/>
                <g id="sw">
                    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
                    <path d="M14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                </g>
                <g id="mx" style="display:none">
                    <line x1="15" y1="9" x2="21" y2="15" stroke="#757575" stroke-width="2.2"/>
                    <line x1="21" y1="9" x2="15" y2="15" stroke="#757575" stroke-width="2.2"/>
                </g>
            </svg>
            <div id="vb">
                <div class="vb"></div><div class="vb"></div><div class="vb"></div><div class="vb"></div>
                <div class="vb"></div><div class="vb"></div><div class="vb"></div><div class="vb"></div>
            </div>
        </div>
    `;

    link.replaceWith(wrapper);

    const audio = new Audio(src);
    audio.preload = 'metadata';

    const pl   = document.getElementById('pl');
    const ps   = document.getElementById('ps');
    const prog = document.getElementById('prog');
    const pf   = document.getElementById('pf');
    const tt   = document.getElementById('tt');
    const dt   = document.getElementById('dt');
    const vi   = document.getElementById('vi');
    const vb   = document.getElementById('vb');
    const sw   = document.getElementById('sw');
    const mx   = document.getElementById('mx');
    const bars = [...document.querySelectorAll('.vb')];

    let lastVol = 0.75;
    let scrub = false;
    let vScrub = false;

    const fmt = s => {
        if (isNaN(s) || s < 0) return '0:00';
        return Math.floor(s / 60) + ':' + (s % 60 < 10 ? '0' : '') + Math.floor(s % 60);
    };

    const setVol = v => {
        bars.forEach((b, i) => b.style.background = i < Math.ceil(v * 8) ? '#fff' : '#757575');
        sw.style.display  = v > 0 ? 'block' : 'none';
        mx.style.display  = v > 0 ? 'none'  : 'block';
    };

    const scrubProg = x => {
        const r = prog.getBoundingClientRect();
        const ratio = Math.max(0, Math.min((x - r.left) / r.width, 1));
        const d = audio.duration || 0;
        pf.style.width    = ratio * 100 + '%';
        tt.style.left     = ratio * 100 + '%';
        tt.textContent    = fmt(ratio * d);
        dt.textContent    = fmt(d - ratio * d);
        audio.currentTime = ratio * d;
    };

    const scrubVol = x => {
        const r = vb.getBoundingClientRect();
        const v = Math.max(0, Math.min((x - r.left) / r.width, 1));
        audio.volume = v;
        audio.muted  = v === 0;
        if (v > 0) lastVol = v;
        setVol(v);
    };

    document.getElementById('ppb').onclick = () => {
        if (audio.paused) {
            audio.play();
            pl.style.display = 'none';
            ps.style.display = 'block';
        } else {
            audio.pause();
            pl.style.display = 'block';
            ps.style.display = 'none';
        }
    };

    audio.addEventListener('loadedmetadata', () => dt.textContent = fmt(audio.duration));

    audio.addEventListener('timeupdate', () => {
        if (scrub) return;
        const p = audio.currentTime / (audio.duration || 1) * 100;
        pf.style.width = p + '%';
        tt.style.left  = p + '%';
        tt.textContent = fmt(audio.currentTime);
        dt.textContent = fmt((audio.duration || 0) - audio.currentTime);
    });

    audio.addEventListener('ended', () => {
        pl.style.display = 'block';
        ps.style.display = 'none';
    });

    prog.addEventListener('mousedown', e => { scrub = true; scrubProg(e.clientX); });
    vb.addEventListener('mousedown',   e => { vScrub = true; scrubVol(e.clientX); e.preventDefault(); });
    document.addEventListener('mousemove', e => { if (scrub) scrubProg(e.clientX); if (vScrub) scrubVol(e.clientX); });
    document.addEventListener('mouseup', () => { scrub = false; vScrub = false; });

    vi.addEventListener('click', () => {
        audio.muted = !audio.muted;
        setVol(audio.muted ? 0 : (audio.volume = lastVol));
    });

    audio.volume = lastVol;
    setVol(lastVol);
});
