import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const template = readFileSync(new URL('../src/app/app.html', import.meta.url), 'utf8');
const component = readFileSync(new URL('../src/app/app.ts', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../src/app/app.scss', import.meta.url), 'utf8');

test('header navigation uses matching underline bars for hover and active states', () => {
  assert.match(styles, /\.site-header__nav-link,[\s\S]*opacity: 0\.95;/);
  assert.match(styles, /&::after[\s\S]*width|right: 0;[\s\S]*left: 0;[\s\S]*transform: scaleX\(0\)/);
  assert.match(styles, /&:hover,[\s\S]*&::after[\s\S]*transform: scaleX\(1\)/);
  assert.match(styles, /\.site-header__nav-link--active[\s\S]*&::after[\s\S]*transform: scaleX\(1\)/);
});

test('header keeps the home illumination active on single content pages', () => {
  assert.match(template, /\[class\.site-header__nav-link--active\]="activeNav\(\) === 'home'"/);
  assert.match(component, /protected activeNav\(\): 'home' \| 'trading' \| 'platform' \| 'shows'/);
  assert.match(component, /return 'home';/);
});

test('header calculates one active menu item for every visible-header route', () => {
  assert.match(template, /\[class\.site-header__nav-link--active\]="activeNav\(\) === 'home'"/);
  assert.match(template, /\[class\.site-header__nav-link--active\]="activeNav\(\) === 'trading'"/);
  assert.match(template, /\[class\.site-header__nav-link--active\]="activeNav\(\) === 'platform'"/);
  assert.match(template, /\[class\.site-header__nav-link--active\]="activeNav\(\) === 'shows'"/);
  assert.match(component, /protected activeNav\(\): 'home' \| 'trading' \| 'platform' \| 'shows'/);
});

test('navigation restores the header after a route change', () => {
  assert.match(component, /this\.headerHidden\.set\(false\)/);
});
