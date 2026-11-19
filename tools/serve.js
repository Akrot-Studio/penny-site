#!/usr/bin/env node
/* Serves dist/site on http://localhost:8788 the way Cloudflare Pages does for static files: /features serves features.html,
   unknown paths get 404.html. Functions (newsletter, /api/redeem) are not run here; use `npx wrangler pages dev` for those.
   Usage: node tools/build-site.js && node tools/serve.js [port] */
const http = require('http'), fs = require('fs'), path = require('path');
const DIR = path.join(__dirname, '..', 'dist', 'site'), PORT = +process.argv[2] || 8788;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml', '.ico': 'image/x-icon' };
http.createServer((q, r) => {
  let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  let f = path.join(DIR, p); if (!f.startsWith(DIR)) { r.writeHead(400); return r.end(); }
  if (!fs.existsSync(f) && fs.existsSync(f + '.html')) f += '.html';
  const ok = fs.existsSync(f) && fs.statSync(f).isFile(), file = ok ? f : path.join(DIR, '404.html');
  r.writeHead(ok ? 200 : 404, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(r);
}).listen(PORT, () => console.log(`dist/site on http://localhost:${PORT}`));
