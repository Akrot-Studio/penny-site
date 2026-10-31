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

  /* newsletter: sent in the background with a reply in place; without JavaScript the form posts and gets a page back */
  $$('form.nl').forEach(f => {
    f.elements.source.value = location.pathname; f.elements.lang.value = (navigator.language || '').slice(0, 16);
    const msg = f.querySelector('.nl-msg'), btn = f.querySelector('button');
    f.addEventListener('submit', async e => {
      e.preventDefault(); btn.disabled = true; msg.className = 'nl-msg'; msg.textContent = '';
      let r = null; try { r = await (await fetch(f.action, { method: 'POST', body: new FormData(f), headers: { Accept: 'application/json' } })).json(); } catch {}
      btn.disabled = false;
      msg.textContent = r ? r.msg : 'Something went wrong. Please try again in a moment.';
      msg.classList.add(r && r.ok ? 'ok' : 'bad');
      if (r && r.ok) f.classList.add('done');
    });
  });

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

/* Email links: a mailto: link does nothing on many computers (no email app set up), so pressing any email address
   offers Gmail, Outlook, your email app, or copying the address. Each address gets a subject that says what it's
   about, so the message is easy to spot in the inbox. */
(() => {
  const SUBJ = { 'support@akrot.app': 'Penny support', 'billing@akrot.app': 'Penny billing question', 'press@akrot.app': 'Press inquiry', 'business@akrot.app': 'Partnership inquiry', 'hello@akrot.app': 'Hello from penny.akrot.app' };
  let box = null;
  const close = () => { if (box) { box.remove(); box = null; document.removeEventListener('keydown', onKey); } };
  const onKey = e => { if (e.key === 'Escape') close(); };
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[href^="mailto:"]'); if (!a) return;
    e.preventDefault(); close();
    const u = new URL(a.getAttribute('href')), to = decodeURIComponent(u.pathname), q = encodeURIComponent;
    const subject = u.searchParams.get('subject') || SUBJ[to.toLowerCase()] || '', body = u.searchParams.get('body') || '';
    const links = [
      ['Gmail', `https://mail.google.com/mail/?view=cm&fs=1&to=${q(to)}&su=${q(subject)}&body=${q(body)}`],
      ['Outlook', `https://outlook.live.com/mail/0/deeplink/compose?to=${q(to)}&subject=${q(subject)}&body=${q(body)}`],
      ['Email app', `mailto:${to}?subject=${q(subject)}${body ? '&body=' + q(body) : ''}`]
    ];
    box = document.createElement('div'); box.className = 'mailpick'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Send an email');
    box.innerHTML = `<div class="mp-card"><b>Write to <span dir="ltr"></span></b><div class="mp-opts"></div><button type="button" class="mp-copy">Copy address</button><button type="button" class="mp-x" aria-label="Close">×</button></div>`;
    box.querySelector('span').textContent = to;
    const opts = box.querySelector('.mp-opts');
    for (const [label, href] of links) { const l = document.createElement('a'); l.textContent = label; l.href = href; if (!href.startsWith('mailto:')) { l.target = '_blank'; l.rel = 'noopener'; } l.onclick = () => setTimeout(close, 50); opts.appendChild(l); }
    box.querySelector('.mp-copy').onclick = async ev => { try { await navigator.clipboard.writeText(to); ev.target.textContent = 'Copied'; } catch { ev.target.textContent = to; } setTimeout(close, 900); };
    box.querySelector('.mp-x').onclick = close;
    box.addEventListener('click', ev => { if (ev.target === box) close(); });
    document.body.appendChild(box); document.addEventListener('keydown', onKey); opts.querySelector('a').focus();
  });
})();
