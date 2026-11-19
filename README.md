# Penny website

The site at https://penny.akrot.app for **Penny**, Akrot Studio's private budget app (Windows and Android).
The app itself lives in its own repository (`penny-source`, checked out at `../penny`). This repo has everything the site needs
to build and run on its own.

## Where things are
- `site/`: the pages, `site.css`, `theme.css` (the 2026 redesign layer), `site.js`, `fonts/`, `img/`, `llms.txt`.
  `site/partials/` holds the shared header and footer (with language copies such as `header.es.html`); the build puts them into every page.
- `functions/`: Cloudflare Pages Functions. `api/subscribe.js` and `unsubscribe.js` (the newsletter), `api/redeem.js` (the app turns
  promo and purchase codes into signed Pro keys here; the app calls `https://penny.akrot.app/api/redeem`), `_middleware.js`
  (forwards old addresses such as studdit.app and penny-32k.pages.dev). Data: D1 database `penny-newsletter` (binding `NEWSLETTER`).
- `app/`: copied from the app repo, never edited by hand. `app.json` (the app's version) and `penny-core.min.js` (the app's
  parser and health model, which the home page and health check run in the browser).
- `tools/build-site.js`: builds `site/` into `dist/site` (partials, version stamps, clean links, `_headers`, `robots.txt`, `sitemap.xml`).
  It **fails** if a release headline is stale or if any page links to GitHub. Never bypass either check.
- `tools/sync-from-app.js`: refreshes `app/` from `../penny`. `tools/newsletter-schema.sql`: the D1 tables.

## Build and check
```bash
node tools/build-site.js
node --test tests/site.test.js
```
Serve it with `node tools/serve.js` (http://localhost:8788) and check it at phone (320-412 px) and desktop widths. Functions need `npx wrangler pages dev`.

## After a Penny release
1. In `../penny`: the release is committed (version in `package.json`, `renderer/penny-core.js` regenerated).
2. Here: `node tools/sync-from-app.js`, update the hand-written headlines (the NEW banner in `index.html`, the heading and entries in
   `changelog.html`; the build fails until they name the new major.minor), build, check, commit.
3. Push to `main` only when the owner wants it live.

Site screenshots of the real app (`site/img`) are taken by `tools/site-shots.js` in the app repo; copy them here and bump `?v=`.

## Deploy
See `docs/CUTOVER.md` for the current state. Until the cutover, the live site is still deployed from `penny-source`.

## Rules
- Claims must match the app (`docs/` in the app repo). Privacy policy changes need the owner's approval and a new date.
- Never link GitHub (the repos are private). Contact: support@akrot.app.
- Deploys, DNS, GitHub repos and anything public happen only when the owner asks.
