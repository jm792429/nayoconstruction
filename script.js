/* =========================
   HERO / SERVICES SLIDER
   ========================= */
(() => {
  'use strict';

  const slider  = document.querySelector('.site-slider');
  if (!slider) return;

  const slides   = Array.from(slider.querySelectorAll('.slide'));
  const dotsWrap = slider.querySelector('.slider-dots');
  const prevBtn  = slider.querySelector('.slider-arrow.prev');
  const nextBtn  = slider.querySelector('.slider-arrow.next');

  // Set background from data-bg if present
  slides.forEach(s => {
    const bg = s.getAttribute('data-bg');
    if (bg) s.style.setProperty('--bg', `url("${bg}")`);
  });

  // Build dots
  slides.forEach((_, idx) => {
    const b = document.createElement('button');
    b.setAttribute('aria-label', `Aller à la diapositive ${idx + 1}`);
    if (idx === 0) b.classList.add('active');
    b.addEventListener('click', () => go(idx, true));
    dotsWrap.appendChild(b);
  });
  const dots = Array.from(dotsWrap.children);

  let i = 0;
  let timer = null;
  const AUTOPLAY_MS = 6000;

  function activate(idx) {
    slides.forEach(s => {
      s.classList.remove('is-active');
      s.style.pointerEvents = 'none';
    });
    slides[idx].classList.add('is-active');
    slides[idx].style.pointerEvents = 'auto';

    dots.forEach(d => d.classList.remove('active'));
    dots[idx].classList.add('active');

    const revealEls = slides[idx].querySelectorAll('.reveal');
    revealEls.forEach(el => {
      el.classList.remove('in');
      void el.offsetWidth;
      el.classList.add('in');
    });

    i = idx;
  }

  function go(n, user) {
    const idx = (n + slides.length) % slides.length;
    activate(idx);
    if (user) restart();
  }

  function next() { go(i + 1); }
  function prev() { go(i - 1); }

  function start() { stop(); timer = setInterval(next, AUTOPLAY_MS); }
  function stop()  { if (timer) { clearInterval(timer); timer = null; } }
  function restart(){ start(); }

  window.sliderControl = { start, stop };

  if (nextBtn) nextBtn.addEventListener('click', () => go(i + 1, true));
  if (prevBtn) prevBtn.addEventListener('click', () => go(i - 1, true));

  slider.addEventListener('mouseenter', stop);
  slider.addEventListener('mouseleave', start);

  // Swipe
  let sx = 0, dx = 0;
  slider.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
  slider.addEventListener('touchmove',  e => { dx = e.touches[0].clientX; }, { passive: true });
  slider.addEventListener('touchend',   () => {
    if (Math.abs(dx - sx) > 40) {
      if (dx < sx) go(i + 1, true);
      else         go(i - 1, true);
    }
    sx = 0; dx = 0;
  }, { passive: true });

  activate(0);
  start();
})();

/* =====================================
   BEFORE/AFTER COMPARE
   – slider is in sibling .cmp-instruction
   – height capped to viewport; keeps ratio
   ===================================== */
(() => {
  const comps = document.querySelectorAll('.compare');
  if (!comps.length) return;

  // helper: find first ancestor with a width
  function widestParent(el){
    let p = el.parentElement;
    while (p && !p.clientWidth) p = p.parentElement;
    return p || document.body;
  }

  // Cap compare height to a fraction of viewport; keep image ratio
  function sizeCompareBox(cmp){
    const before = cmp.querySelector('.before');
    if (!before) return;

    [before, cmp.querySelector('.after')].forEach(img => {
      if (img) { img.style.objectFit = 'contain'; img.style.objectPosition = 'center'; }
    });

    const isMobile = window.innerWidth < 820;
    const MAX_VH   = isMobile ? 0.68 : 0.56; // 68% on mobile, 56% desktop
    const MIN_H    = 320;

    const set = () => {
      const parent = widestParent(cmp);
      const availW = Math.max(1, parent.clientWidth);

      let ratio = 0;
      if (before.naturalWidth && before.naturalHeight) {
        ratio = before.naturalHeight / before.naturalWidth;
      } else if (before.width && before.height) {
        ratio = before.height / before.width;
      }
      if (!ratio) return;

      const maxH = Math.max(MIN_H, Math.floor(window.innerHeight * MAX_VH));
      const idealH = availW * ratio;

      if (idealH <= maxH) {
        cmp.style.width  = '';                 // keep CSS width
        cmp.style.height = idealH + 'px';
        cmp.style.marginLeft = '';
        cmp.style.marginRight = '';
      } else {
        const newW = Math.floor(maxH / ratio);
        cmp.style.width  = newW + 'px';
        cmp.style.height = maxH + 'px';
        cmp.style.marginLeft = 'auto';
        cmp.style.marginRight = 'auto';
      }
    };

    if (before.complete) set();
    else before.addEventListener('load', set, { once:true });

    const ro = new ResizeObserver(set);
    ro.observe(cmp);
    const p = widestParent(cmp);
    if (p) ro.observe(p);
    window.addEventListener('resize', set, { passive: true });
    window.addEventListener('orientationchange', set);
  }

  comps.forEach((cmp) => {
    const before = cmp.querySelector('.before');
    const after  = cmp.querySelector('.after');
    const bar    = cmp.querySelector('.cmp-handle');

    // Slider input lives in the sibling .cmp-instruction
    const instruction =
      (cmp.nextElementSibling && cmp.nextElementSibling.classList.contains('cmp-instruction'))
        ? cmp.nextElementSibling
        : (cmp.parentElement ? cmp.parentElement.querySelector('.cmp-instruction') : null);

    const range = instruction ? instruction.querySelector('.cmp-range') : null;

    if (!before || !after || !bar) return;

    const clamp = (v) => Math.max(0, Math.min(100, Number(v)));
    const setVal = (v) => {
      const val = clamp(v);
      after.style.clipPath = `inset(0 ${100 - val}% 0 0)`; // reveal from left
      bar.style.left = `${val}%`;
      return val;
    };

    const initVal = range && Number.isFinite(+range.value) ? +range.value : 0;
    setVal(initVal);
    if (range) range.value = clamp(initVal);

    if (range) {
      const onInput = (e) => setVal(e.target.value);
      range.addEventListener('input', onInput);
      range.addEventListener('change', onInput);
      ['click','input','change','pointerdown','mousedown','touchstart']
        .forEach(ev => range.addEventListener(ev, e => e.stopPropagation(), { passive: true }));
    }

    // Drag directly on the image
    const toPct = (clientX) => {
      const r = cmp.getBoundingClientRect();
      return ((clientX - r.left) / r.width) * 100;
    };
    const moveTo = (x) => {
      const v = clamp(toPct(x));
      setVal(v);
      if (range) range.value = v;
    };
    const begin = (e) => {
      try { cmp.setPointerCapture && cmp.setPointerCapture(e.pointerId); } catch(_) {}
      moveTo(e.clientX);
      const move = (ev) => moveTo(ev.clientX);
      const up   = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    };
    cmp.addEventListener('pointerdown', begin);

    // Stop bubbling into the main slider
    [bar, instruction].forEach(el => {
      if (!el) return;
      ['click','pointerdown','mousedown','touchstart']
        .forEach(ev => el.addEventListener(ev, e => e.stopPropagation(), { passive: true }));
    });

    sizeCompareBox(cmp);
  });

  // Pause main slider while interacting with compare
  document.querySelectorAll('.compare').forEach((cmp) => {
    const stop  = () => window.sliderControl && window.sliderControl.stop();
    const start = () => window.sliderControl && window.sliderControl.start();
    ['pointerdown','touchstart','mousedown'].forEach(ev => cmp.addEventListener(ev, stop, { passive:true }));
    ['pointerup','touchend','mouseup','mouseleave','pointercancel'].forEach(ev =>
      cmp.addEventListener(ev, () => setTimeout(start, 800))
    );
  });
})();

/* =========================
   VIDEO CAROUSEL (scoped)
   ========================= */
(() => {
  const wrap = document.querySelector("#videos");
  if (!wrap) return;

  const videoEl  = wrap.querySelector("#carouselVideo");
  const sourceEl = videoEl ? videoEl.querySelector("source") : null;
  const prevBtn  = wrap.querySelector(".carousel-control.prev");
  const nextBtn  = wrap.querySelector(".carousel-control.next");
  const dots     = [...wrap.querySelectorAll(".carousel-indicators .dot")];

  if (!videoEl || !sourceEl) return;

  const videos = [
    "WhatsApp Video 2025-06-03 at 12.01.43.mp4",
    "WhatsApp Video 2025-06-14 at 12.08.27.mp4",
    "WhatsApp Video 2025-06-14 at 12.08.27 (1).mp4"
  ];

  let i = 0;
  function show(n){
    i = (n + videos.length) % videos.length;
    sourceEl.src = videos[i];
    videoEl.load();
    videoEl.play().catch(() => {});
    dots.forEach(d => d.classList.remove("active"));
    if (dots[i]) dots[i].classList.add("active");
  }

  if (prevBtn) prevBtn.addEventListener("click", () => show(i - 1));
  if (nextBtn) nextBtn.addEventListener("click", () => show(i + 1));
  dots.forEach(d => d.addEventListener("click", () => show(+d.dataset.index)));

  show(0);
})();
