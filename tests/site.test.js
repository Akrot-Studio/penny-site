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
