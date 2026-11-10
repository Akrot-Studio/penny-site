const test = require('node:test'), assert = require('node:assert');
const { stampVersion, VERSION } = require('../tools/build-site.js');

test('site build stamps the app version from package.json', () => {
  const page = '{"softwareVersion":"1.1.1"} <p class="ver"><i></i>Version 1.1.1</p> <small>Available now · version 1.0.0</small> Privacy <p class="ver">Version 1.6 · October</p>';
  const out = stampVersion(page);
  assert.ok(out.includes(`"softwareVersion":"${VERSION}"`));
  assert.ok(out.includes(`Version ${VERSION}</p>`));
  assert.ok(out.includes(`Available now · version ${VERSION}`));
  assert.ok(out.includes('Version 1.6 · October'), 'the privacy policy keeps its own version');
});

test('site build rejects release headlines that name an old version', () => {
  const { staleHeadlines } = require('../tools/build-site.js');
  const ok = { 'index.html': '<a class="news" href="x"><b>NEW</b>Penny 2.3: sync', 'changelog.html': '<h1>Penny 2.3.<br>' };
  assert.deepStrictEqual(staleHeadlines(ok, '2.3.0'), []);
  assert.deepStrictEqual(staleHeadlines(ok, '2.3.4'), [], 'a patch release keeps the headlines');
  assert.strictEqual(staleHeadlines(ok, '2.4.0').length, 2);
  assert.strictEqual(staleHeadlines({ 'index.html': '<a class="news"><b>NEW</b>Penny 1.1: Hello', 'changelog.html': '<h1>Penny 1.1.' }, '2.3.0').length, 2);
  assert.strictEqual(staleHeadlines({ ...ok, 'changelog.html': '<h1>Penny 2.30.' }, '2.3.0').length, 1);
});
