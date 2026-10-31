'use strict';
/* Shared by every page: the menu on phones, the top bar's line, the year, reveal on scroll, and searching the FAQ */
(() => {
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  $$('.yr').forEach(e => { e.textContent = new Date().getFullYear(); });

  const bar = $('#bar'), menu = $('.menu');
  if (bar) addEventListener('scroll', () => bar.classList.toggle('scrolled', scrollY > 8), { passive: true });
  if (menu) {
    const set = open => { bar.classList.toggle('open', open); menu.setAttribute('aria-expanded', String(open));
      menu.querySelector('use').setAttribute('href', 'img/icons.svg#i-' + (open ? 'x' : 'menu')); };
    menu.addEventListener('click', () => set(!bar.classList.contains('open')));
    $$('#nav a').forEach(a => a.addEventListener('click', () => set(false)));
    addEventListener('keydown', e => { if (e.key === 'Escape' && bar.classList.contains('open')) { set(false); menu.focus(); } });
  }

  /* the home page runs its own reveal */
  if (!window.__rvReady) {
    const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }),
      { rootMargin: '0px 0px -10% 0px', threshold: .06 }) : null;
    $$('.rv').forEach(el => io ? io.observe(el) : el.classList.add('in'));
    window.__rvReady = true;
  }

  /* FAQ search: hides questions that don't match, and the headings left with none */
  const q = $('#faqSearch');
  if (q) {
    const items = $$('.qa details'), none = $('.qa .none');
    q.addEventListener('input', () => {
      /* "currency" should find "currencies": compare stems */
      const words = q.value.toLowerCase().split(/\s+/).filter(Boolean).map(w => w.length > 4 ? w.replace(/(ies|y|es|s)$/, '') : w);
      let shown = 0;
      items.forEach(d => { const hit = words.every(w => d.textContent.toLowerCase().includes(w)); d.hidden = !hit; if (hit) shown++; d.open = words.length > 0 && hit && shown <= 3; });
      $$('.qa section').forEach(s => { s.hidden = !s.querySelector('details:not([hidden])'); });
      if (none) none.hidden = shown > 0;
    });
  }
})();
