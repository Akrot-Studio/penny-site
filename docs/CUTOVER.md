# Moving penny.akrot.app to this repo

Status (19 Nov 2026): steps 1-3 done. Private repo `Akrot-Studio/penny-site`; Cloudflare Pages project `penny-site`
(https://penny-site-3kh.pages.dev) builds every push to `main`; D1 binding in place; all 26 pages match live.
Step 4 done: the owner set `LICENSE_KEY` (the only secret the old project has); `/api/redeem` answers "That code isn't
valid" for a made-up code.
Step 6 done (19 Nov 2026, 17:51): penny.akrot.app moved from project `penny` to `penny-site` (DNS `penny` CNAME ->
`penny-site-3kh.pages.dev`); about 2 minutes of 522 errors. Checked live afterwards: all pages 200 with version 2.4.0,
`/api/redeem` and `/unsubscribe` answer, headers set; studdit.app, www.studdit.app and penny-32k.pages.dev still 301 to
penny.akrot.app (they stay on project `penny`, whose middleware forwards them).
**penny.akrot.app now deploys from this repo.** Site changes in `penny-source` no longer reach it; its Deploy website
workflow still uploads to the old `penny` project (harmless, but its final live check will fail) until step 8 removes it.
Next: steps 8-10 (clean up penny-source, delete its Cloudflare token secret, update the studio docs).

It was split from `penny-source` at commit `36269c8` with the history of the
site kept (53 commits touching `site/`, `functions/`, `tools/build-site.js`, `tools/newsletter-schema.sql`, `wrangler.toml`,
`tests/site.test.js`).

## What was checked
- `node tools/build-site.js` here produces a `dist/site` **byte-identical** to the build of `penny-source` at `36269c8`.
- All 26 built pages, `site.css`, `theme.css`, `site.js`, `penny-core.js`, `robots.txt`, `llms.txt`, every image and font match
  what https://penny.akrot.app serves today. The only differences are Cloudflare's own email obfuscation (added at the edge, so it
  will appear again) and Windows line endings in the local checkout.
- In a browser (local `node tools/serve.js`): home and health check run Penny's core (`PennyCore` loads), no console errors,
  no broken images, no horizontal scroll at 375 px and 1440 px; at 320 px only `/privacy` overflows by about 26 px (same files as live, so live
  has it too; a separate fix).
- `node --test tests/site.test.js`: 2 passing. The GitHub-link check and the stale-headline check are unchanged.

## What the site needs from the app, and how it stays in sync
| Need | Before | Now |
|---|---|---|
| App version stamped on pages | `package.json` | `app/app.json`, written by `tools/sync-from-app.js` |
| Penny's parser and health model | esbuild minified `renderer/penny-core.js` at build time | `app/penny-core.min.js`, minified by the sync script (esbuild from the app repo), committed |
| Release headlines and changelog entries | hand-written in `site/` | unchanged: still hand-written, still enforced by the build |
| Site screenshots of the app | `tools/site-shots.js` wrote `site/img` | still taken by the app repo's tool; its output folder should point at `../penny-site/site/img` |

The site build now needs **no packages and no access to the private app repo**, so Cloudflare can build it from GitHub.
Rule: after each Penny release, run `node tools/sync-from-app.js`, update the headlines, build, commit (see README).
Until the cutover is done, **don't edit the site in `penny-source`** (or port the change here too).

## Things that must keep working
- `/api/redeem`: the app (`renderer/pro.js`) turns promo and purchase codes into Pro keys here. It needs the secrets
  `LICENSE_KEY`, `LS_STORE_ID`, `LS_PRODUCT_ID` on the Cloudflare project, and the D1 binding `NEWSLETTER`.
- `/api/subscribe` and `/unsubscribe` (newsletter, D1 `penny-newsletter`), and links in already-sent emails.
- `_middleware.js` forwards studdit.app, www.studdit.app and penny-32k.pages.dev to penny.akrot.app.

## Recommended: Cloudflare Pages Git integration (same as herd-site)
Each step marked **[owner]** needs the owner; **[approval]** means Claude does it only after the owner says yes.

1. **[approval]** Create the private GitHub repo `Akrot-Studio/penny-site` and push `main`.
2. **[owner]** GitHub > Akrot-Studio org settings > GitHub Apps > Cloudflare Workers and Pages > Repository access: add `penny-site`.
3. **[owner, or approval]** Cloudflare > Workers & Pages > Create > Pages > Connect to Git > `Akrot-Studio/penny-site`.
   Project name e.g. `penny-site`; production branch `main`; build command `node tools/build-site.js`; output `dist/site`.
   (A direct-upload project like `penny` can't be switched to Git, so this has to be a new project.)
   Then set `name` in `wrangler.toml` to the new project name and push.
4. **[owner]** On the new project, add the secrets `LICENSE_KEY`, `LS_STORE_ID`, `LS_PRODUCT_ID` (same values as project `penny`)
   and check Settings > Bindings shows D1 `NEWSLETTER` -> `penny-newsletter` (it comes from `wrangler.toml`). Redeploy after.
5. Test on the new `*.pages.dev` address before touching the domain: all pages 200 and show the current version;
   `POST /api/redeem` with a made-up code answers "That code isn't valid" (a 503 means `LICENSE_KEY` is missing);
   `/unsubscribe` with no token shows its page. Don't sign up a real address on the live database without the owner's say-so.
6. **[approval: domain/DNS change]** Remove `penny.akrot.app` from project `penny`'s custom domains and add it to the new project;
   Cloudflare points the `penny` DNS record at the new project. Expect a few minutes when the site and `/api/redeem` may fail;
   pick a quiet time. Then check the live pages, version and `/api/redeem` again.
7. Leave project `penny` in place for now: `penny-32k.pages.dev` keeps forwarding to penny.akrot.app through its middleware.
   Deleting it later is the owner's call.
8. **[approval]** In `penny-source` (one PR): remove `site/`, `functions/`, `tools/build-site.js`, `tools/newsletter-schema.sql`
   (keep it if `tools/pro-codes.js` docs point at it), `wrangler.toml`, `tests/site.test.js`, `.github/workflows/site.yml`,
   the `node tools/build-site.js` line in `ci.yml`, the `site` / `site:deploy` scripts in `package.json`, `site/penny-core.js` in
   `.gitignore`; point `tools/site-shots.js` at `../penny-site/site/img`; update `CLAUDE.md` (map, skip list), the `deploy-sites`,
   `release` and `release-readiness` skills (changelog and headlines now live in penny-site, plus the sync step),
   `docs/BUILD.md` and the other docs that name `site/`. Links to `https://penny.akrot.app` in the app stay as they are.
   `tools/pro-codes.js` keeps managing promo codes in D1 (it uses `--remote`, no project needed).
9. **[owner]** Delete the `CLOUDFLARE_API_TOKEN` secret from `penny-source` and revoke that token if nothing else uses it.
10. Update the studio toolkit doc (`docs/AKROT-CLAUDE-TOOLKIT.md`) and the `akrot-website-studio` skill, which point at `H:/penny/site`.

From then on: a push to `main` of `penny-site` deploys penny.akrot.app; other branches get preview addresses.

## Alternative with no domain move
Keep project `penny` (direct upload) and move the deploy workflow here: add `.github/workflows/deploy.yml` (build, then
`wrangler pages deploy`) and **[owner]** add a `CLOUDFLARE_API_TOKEN` secret to `penny-site`. No new project, no secret re-entry,
no downtime for `/api/redeem`. The cost: a long-lived API token in another repo, and it differs from herd-site.
