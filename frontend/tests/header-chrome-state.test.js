import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const template = readFileSync(new URL('../src/app/app.html', import.meta.url), 'utf8');
const component = readFileSync(new URL('../src/app/app.ts', import.meta.url), 'utf8');

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
