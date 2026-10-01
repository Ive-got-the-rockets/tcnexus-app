const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const detailStyles = fs.readFileSync(path.join(root, 'src/app/features/course-detail/course-detail.scss'), 'utf8');
const catalogStyles = fs.readFileSync(path.join(root, 'src/app/features/catalog/course-catalog.scss'), 'utf8');
const mainPageStyles = fs.readFileSync(path.join(root, 'src/app/features/layout-style-3/layout-style-3.scss'), 'utf8');

for (const styles of [detailStyles, catalogStyles, mainPageStyles]) {
  assert.match(styles, /background: (?:#0C0D0D|rgba\(12, 13, 13, 0\.[78]\));/);
  assert.match(styles, /border: none;/);
  assert.match(styles, /background: rgba\(51, 55, 61, 0\.4\);/);
}

assert.doesNotMatch(detailStyles, /linear-gradient\(to left, color-mix\(in srgb, var\(--signal\)/);
assert.doesNotMatch(catalogStyles, /linear-gradient\(to left, color-mix\(in srgb, var\(--signal\)/);
assert.doesNotMatch(mainPageStyles, /linear-gradient\(to left, color-mix\(in srgb, var\(--signal\)/);

for (const styles of [detailStyles, catalogStyles]) {
  assert.match(styles, /\.lesson-row__play svg,[\s\S]*\.lesson-row__restart svg[\s\S]*background: rgba\(51, 55, 61, 0\.4\);/);
  assert.match(styles, /\.lesson-row__play svg,[\s\S]*\.lesson-row__restart svg[\s\S]*border: none;/);
  assert.match(styles, /\.lesson-row__play svg,[\s\S]*\.lesson-row__restart svg[\s\S]*color: var\(--paper\);/);
  assert.match(styles, /\.lesson-row__restart[\s\S]*background: #fff;[\s\S]*color: #33373D;/);
}

assert.match(mainPageStyles, /\.episode-panel__header[\s\S]*background: rgba\(12, 13, 13, 0\.9\);/);
assert.match(mainPageStyles, /\.episode-panel__close[\s\S]*border: none;[\s\S]*border-radius: 999px;[\s\S]*background: rgba\(51, 55, 61, 0\.4\);/);
assert.match(mainPageStyles, /\.episode-panel__close[\s\S]*background: #fff;[\s\S]*color: #33373D;/);
assert.match(mainPageStyles, /\.lesson-row[\s\S]*background: rgba\(12, 13, 13, 0\.9\);/);
assert.match(mainPageStyles, /\.style-course-modal__lesson[\s\S]*background: rgba\(12, 13, 13, 0\.9\);/);
assert.match(mainPageStyles, /\.style-course-modal__close[\s\S]*border: none;[\s\S]*border-radius: 999px;[\s\S]*background: rgba\(51, 55, 61, 0\.4\);/);
assert.match(mainPageStyles, /\.style-course-modal__close:hover[\s\S]*background: #fff;[\s\S]*color: #33373D;/);
assert.match(detailStyles, /\.lesson-row[\s\S]*background: rgba\(12, 13, 13, 0\.9\);/);
assert.match(mainPageStyles, /\.episode-panel__close[\s\S]*border: none;[\s\S]*border-radius: 999px;[\s\S]*background: rgba\(51, 55, 61, 0\.4\);/);
assert.match(mainPageStyles, /\.episode-panel__close[\s\S]*background: #fff;[\s\S]*color: #33373D;/);

console.log('lesson card style contract passes');
