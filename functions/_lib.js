/* Shared by the newsletter functions: the consent wording people agree to, and a small page for replies without JavaScript */
export const CONSENT = 'The Penny newsletter: news and updates, about once a month. Unsubscribe at any time.';   // shown word for word by the form (site/partials/footer.html)

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const page = (title, body, status = 200) => new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)} – Penny</title>
<link rel="icon" type="image/svg+xml" href="/img/penny-mark.svg"><link rel="stylesheet" href="/site.css"></head><body>
<main id="main"><section class="phero" style="min-height:70vh;display:grid;align-items:center"><div class="wrap narrow">
<a class="brand" href="/" style="margin-bottom:40px"><svg aria-hidden="true"><use href="/img/icons.svg#mark"/></svg>penny</a>
<h1 style="font-size:clamp(34px,5vw,56px)">${esc(title)}</h1>${body}</div></section></main></body></html>`,
  { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
