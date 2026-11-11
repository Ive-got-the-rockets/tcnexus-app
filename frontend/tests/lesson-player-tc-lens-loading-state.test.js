const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const component = fs.readFileSync(path.join(root, 'src/app/features/lesson-player/lesson-player.ts'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'src/app/features/lesson-player/lesson-player.scss'), 'utf8');
const globalStyles = fs.readFileSync(path.join(root, 'src/styles.scss'), 'utf8');

test('real lesson player animates immediately and covers its iframe while TC Lens loads', () => {
  assert.match(component, /tcn-xray-loading/);
  assert.match(component, /Loading TC Lens/);
  assert.match(component, /frame\.addEventListener\('load',[\s\S]*?classList\.remove\('tcn-xray-is-loading'\)/);
  assert.match(component, /classList\.toggle\('tcn-xray-is-loading', open\)/);
  assert.match(styles, /\.tcn-xray-is-loading \.tcn-xray-loading/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
});

test('TC Lens opening is staged from the current player rectangle instead of jumping', () => {
  assert.match(component, /prepareXrayOpenAnimation\(\)/);
  assert.match(component, /getBoundingClientRect\(\)[\s\S]*?classList\.add\('tcn-xray-animating'\)/);
  assert.match(component, /requestAnimationFrame\(\(\) => this\.placeXray\(\)\)/);
  assert.match(globalStyles, /\.player-wrap\.tcn-xray-open:not\(\.tcn-xray-animating\)[\s\S]*?transition:\s*none/);
  assert.match(globalStyles, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.player-wrap/);
});

