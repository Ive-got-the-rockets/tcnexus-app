const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const demoPath = path.join(root, 'public', 'tc-lens-animation-test', 'index.html');
const framePath = path.join(root, 'public', 'tc-lens-animation-test', 'lens-frame.html');

test('isolated TC Lens demo animates before its iframe finishes loading', () => {
  assert.equal(fs.existsSync(demoPath), true, 'demo page must exist');
  assert.equal(fs.existsSync(framePath), true, 'delayed iframe page must exist');

  const demo = fs.readFileSync(demoPath, 'utf8');
  assert.match(demo, /id="tradecheetah-trigger"/);
  assert.match(demo, /id="backend-cue-trigger"/);
  assert.match(demo, /function openLens\(source\)/);
  assert.match(demo, /classList\.add\('is-lens-open', 'is-lens-loading'\)/);
  assert.match(demo, /requestAnimationFrame\(\(\) => lensFrame\.src = FRAME_URL\)/);
  assert.match(demo, /lensFrame\.addEventListener\('load'/);
  assert.match(demo, /classList\.remove\('is-lens-loading'\)/);
  assert.match(demo, /function closeLens\(\)/);
  assert.match(demo, /Loading TC Lens/);
  assert.match(demo, /@media \(prefers-reduced-motion: reduce\)/);
});

