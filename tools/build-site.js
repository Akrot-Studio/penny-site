#!/usr/bin/env node
/* Builds Penny's website (site/) into dist/site, ready for Cloudflare Pages at https://studdit.app.
   The page runs Penny's real parser and health model, so a minified copy of renderer/penny-core.js goes in with it.
   Also writes Cloudflare's _headers file (security headers, long caching for fonts), robots.txt and sitemap.xml.
   Usage: node tools/build-site.js          then, from the repository root (wrangler.toml: the newsletter database):
          npx wrangler pages deploy --branch main      (also uploads functions/, the newsletter sign-up) */
const path = require('path'), fs = require('fs');
const ROOT = path.join(__dirname, '..'), SRC = path.join(ROOT, 'site'), OUT = path.join(ROOT, 'dist', 'site');
const SITE = 'https://studdit.app';

fs.rmSync(OUT, { recursive: true, force: true });
fs.cpSync(SRC, OUT, { recursive: true });
/* the shared header and footer (site/partials) go into every page: <!--header:features--> marks Features as the current page */
const part = n => fs.readFileSync(path.join(SRC, 'partials', n + '.html'), 'utf8').trimEnd();
fs.rmSync(path.join(OUT, 'partials'), { recursive: true, force: true });
const PAGES = fs.readdirSync(OUT).filter(f => f.endsWith('.html'));
for (const f of PAGES) {
  const p = path.join(OUT, f), t = fs.readFileSync(p, 'utf8');
  /* Cloudflare Pages serves /features.html at /features (308 otherwise), so links and canonicals use the clean address */
  const pages = PAGES.filter(x => x !== 'index.html').map(x => x.replace('.html', '')).join('|');
  fs.writeFileSync(p, t.replace(/<!--header:(\w+)-->/, (_, cur) => part('header').replace(`data-p="${cur}"`, `data-p="${cur}" aria-current="page"`)).replace('<!--footer-->', part('footer'))
    .replace(new RegExp(`(href="(?:https://studdit\\.app/)?)(${pages})\\.html([#"])`, 'g'), '$1$2$3'));
}
require('esbuild').buildSync({ entryPoints: [path.join(ROOT, 'renderer', 'penny-core.js')], minify: true, charset: 'utf8', outfile: path.join(OUT, 'penny-core.js'), logLevel: 'warning' });

fs.writeFileSync(path.join(OUT, '_headers'), `/*
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
