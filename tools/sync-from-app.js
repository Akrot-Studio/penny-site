#!/usr/bin/env node
/* Copies what the website needs from the Penny app repository (penny-source) into app/, so this repo builds on its own
   (Cloudflare Pages builds it without access to the private app repo):
     app/app.json          the app's version (stamped onto every page that states it) and where it came from
     app/penny-core.min.js a minified copy of the app's renderer/penny-core.js: the home page and health check run Penny's
                           real parser and health model in the browser
   Run it after every Penny release (or whenever the core changes), then build, check and commit:
     node tools/sync-from-app.js [path to the penny app repo, default ../penny]
   Minifying uses esbuild from the app repo's node_modules (run `npm ci` there first), so this repo needs no packages. */
const path = require('path'), fs = require('fs'), { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..'), APP = path.resolve(process.argv[2] || path.join(ROOT, '..', 'penny')), OUT = path.join(ROOT, 'app');
const pkg = JSON.parse(fs.readFileSync(path.join(APP, 'package.json'), 'utf8'));
if (pkg.name !== 'penny') { console.error(`${APP} is not the Penny app repo (package.json name is "${pkg.name}")`); process.exit(1); }
const core = path.join(APP, 'renderer', 'penny-core.js');
let esbuild;
try { esbuild = require(require.resolve('esbuild', { paths: [APP] })); }
catch { console.error(`esbuild not found in ${APP}/node_modules: run npm ci there first`); process.exit(1); }

/* the commit the copy came from, and whether the app repo had uncommitted changes to the core or the version */
const git = (...a) => { try { return execFileSync('git', ['-C', APP, ...a], { encoding: 'utf8' }).trim(); } catch { return ''; } };
const commit = git('rev-parse', '--short', 'HEAD'), dirty = !!git('status', '--porcelain', '--', 'renderer/penny-core.js', 'package.json');
if (dirty) console.warn('warning: the app repo has uncommitted changes to renderer/penny-core.js or package.json; the copy includes them');

fs.mkdirSync(OUT, { recursive: true });
esbuild.buildSync({ entryPoints: [core], minify: true, charset: 'utf8', outfile: path.join(OUT, 'penny-core.min.js'), logLevel: 'warning' });
fs.writeFileSync(path.join(OUT, 'app.json'), JSON.stringify({ version: pkg.version, from: `penny-source ${commit}${dirty ? ' (with uncommitted changes)' : ''}` }, null, 2) + '\n');
console.log(`app/ now matches Penny ${pkg.version} (penny-source ${commit || 'unknown commit'}${dirty ? ', uncommitted changes' : ''})`);
