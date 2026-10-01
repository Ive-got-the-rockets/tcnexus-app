import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const landingStyles = readFileSync(new URL('../src/app/features/layout-style-3/layout-style-3.scss', import.meta.url), 'utf8');
const detailStyles = readFileSync(new URL('../src/app/features/course-detail/course-detail.scss', import.meta.url), 'utf8');

test('single-page hero uses the landing page responsive content anchor', () => {
  assert.match(landingStyles, /--hero-content-top: 150px/);
  assert.match(detailStyles, /--hero-content-top: 150px/);
  assert.match(detailStyles, /padding: var\(--hero-content-top\) clamp\(/);
  assert.match(detailStyles, /margin-top: calc\(-92vh \+ var\(--hero-content-top\) \+ 51px\)/);
});

test('single-page responsive hero offsets stay in sync with landing breakpoints', () => {
  for (const rule of [
    "@media (min-width: 1600px) {",
    "@media (min-width: 1200px) and (max-width: 1499px) {",
    "@media (min-width: 1200px) and (max-width: 1299px) {",
    "@media (min-width: 1000px) and (max-width: 1199px) {",
  ]) {
    assert.match(landingStyles, new RegExp(rule.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(detailStyles, new RegExp(rule.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(detailStyles, /--hero-content-top: 150px/);
  assert.match(landingStyles, /--hero-content-top: 150px/);
});
