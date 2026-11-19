#!/usr/bin/env node
/* Builds Penny's website (site/) into dist/site, ready for Cloudflare Pages at https://penny.akrot.app.
   The page runs Penny's real parser and health model, so the app's core goes in with it: app/penny-core.min.js, copied from
   the app repo (penny-source) by tools/sync-from-app.js together with the app's version (app/app.json). No packages needed.
   Also writes Cloudflare's _headers file (security headers, long caching for fonts), robots.txt and sitemap.xml.
   Usage: node tools/build-site.js    (Cloudflare Pages runs this on every push; functions/ holds the newsletter and /api/redeem) */
const path = require('path'), fs = require('fs');
const ROOT = path.join(__dirname, '..'), SRC = path.join(ROOT, 'site'), OUT = path.join(ROOT, 'dist', 'site');
const SITE = 'https://penny.akrot.app';
const VERSION = require(path.join(ROOT, 'app', 'app.json')).version;
/* the app's version, wherever a page states it, always matches the app's package.json (via app/app.json) (the pages went stale at 1.0.0 and 1.1.1) */
const stampVersion = t => t.replace(/("softwareVersion":")[\d.]+/g, `$1${VERSION}`).replace(/(class="ver"><i><\/i>Version )[\d.]+/g, `$1${VERSION}`).replace(/(Available now · version )[\d.]+/g, `$1${VERSION}`);
/* headlines that announce a release are written by hand: fail the build until they name the current major.minor */
const staleHeadlines = (pages, version = VERSION) => { const mm = version.split('.').slice(0, 2).join('.'), bad = [];
  if (!new RegExp(`class="news"[^>]*>(?:<b>[^<]*</b>)?Penny ${mm.replace('.', '\\.')}\\b`).test(pages['index.html'] || '')) bad.push(`index.html: the NEW banner must announce Penny ${mm}`);
  if (!new RegExp(`<h1>Penny ${mm.replace('.', '\\.')}\\b`).test(pages['changelog.html'] || '')) bad.push(`changelog.html: the heading must say Penny ${mm}`);
  return bad; };
module.exports = { stampVersion, staleHeadlines, VERSION };
if (require.main !== module) return;

const stale = staleHeadlines(Object.fromEntries(['index.html', 'changelog.html'].map(f => [f, fs.readFileSync(path.join(SRC, f), 'utf8')])));
if (stale.length) { console.error('Out-of-date release headlines:\n  ' + stale.join('\n  ')); process.exit(1); }
fs.rmSync(OUT, { recursive: true, force: true });
fs.cpSync(SRC, OUT, { recursive: true });
/* the shared header and footer (site/partials) go into every page: <!--header:features--> marks Features as the current page.
   A page in another language asks for its own copies: <!--header:compare:es--> and <!--footer:es--> use header.es.html and footer.es.html */
const part = (n, lang) => { const f = path.join(SRC, 'partials', n + (lang ? '.' + lang : '') + '.html'); return fs.readFileSync(fs.existsSync(f) ? f : path.join(SRC, 'partials', n + '.html'), 'utf8').trimEnd(); };
fs.rmSync(path.join(OUT, 'partials'), { recursive: true, force: true });
const PAGES = fs.readdirSync(OUT).filter(f => f.endsWith('.html'));
for (const f of PAGES) {
  const p = path.join(OUT, f), t = fs.readFileSync(p, 'utf8');
  /* Cloudflare Pages serves /features.html at /features (308 otherwise), so links and canonicals use the clean address */
  const pages = PAGES.filter(x => x !== 'index.html').map(x => x.replace('.html', '')).join('|');
  fs.writeFileSync(p, stampVersion(t).replace(/<!--header:(\w+)(?::(\w+))?-->/, (_, cur, lang) => part('header', lang).replace(`data-p="${cur}"`, `data-p="${cur}" aria-current="page"`)).replace(/<!--footer(?::(\w+))?-->/, (_, lang) => part('footer', lang))
    .replace('</head>', '<link rel="stylesheet" href="theme.css?v=1">\n</head>')   /* the 2026 redesign layer, last so it wins */
    .replace(new RegExp(`(href="(?:${SITE.replace(/\./g, '\\.')}/)?)(${pages})\\.html([#"])`, 'g'), '$1$2$3'));
}
fs.copyFileSync(path.join(ROOT, 'app', 'penny-core.min.js'), path.join(OUT, 'penny-core.js'));

fs.writeFileSync(path.join(OUT, '_headers'), `/*
  Strict-Transport-Security: max-age=31536000
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()
/fonts/*
  Cache-Control: public, max-age=31536000, immutable
/img/*
  Cache-Control: public, max-age=604800
`);
fs.writeFileSync(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
const today = new Date().toISOString().slice(0, 10);
fs.writeFileSync(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${PAGES.filter(f => f !== '404.html').map(f => `  <url><loc>${SITE}/${f === 'index.html' ? '' : f.replace('.html', '')}</loc><lastmod>${today}</lastmod></url>`).join('\n')}
</urlset>
`);

/* nothing on the site may point at the code repository */
const bad = [];
for (const f of fs.readdirSync(OUT).filter(f => f.endsWith('.html'))) {
  const t = fs.readFileSync(path.join(OUT, f), 'utf8');
  for (const m of t.matchAll(/https?:\/\/[^"'\s<>]*github[^"'\s<>]*/gi)) bad.push(`${f}: ${m[0]}`);
}
if (bad.length) { console.error('GitHub links found on the site:\n  ' + bad.join('\n  ')); process.exit(1); }
const kb = fs.readdirSync(OUT, { recursive: true }).reduce((n, f) => { const p = path.join(OUT, f); return n + (fs.statSync(p).isFile() ? fs.statSync(p).size : 0); }, 0) / 1024;
console.log(`dist/site ready for ${SITE} (${Math.round(kb)} KB)`);
