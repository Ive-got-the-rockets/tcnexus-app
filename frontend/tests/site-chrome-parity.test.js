import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const detailStyles = readFileSync(new URL('../src/app/features/course-detail/course-detail.scss', import.meta.url), 'utf8');
const appTemplate = readFileSync(new URL('../src/app/app.html', import.meta.url), 'utf8');

test('single-page action controls use the landing-page button treatment', () => {
  assert.match(detailStyles, /\.detail__start[\s\S]*?background: rgba\(51, 55, 61, 0\.4\)/);
  assert.match(detailStyles, /\.detail__start[\s\S]*?border: 0/);
  assert.match(detailStyles, /\.detail__start[\s\S]*?background: #fff/);
  assert.match(detailStyles, /\.detail__trailer[\s\S]*?background: rgba\(51, 55, 61, 0\.4\)/);
  assert.match(detailStyles, /\.detail__overview-btn[\s\S]*?background: rgba\(51, 55, 61, 0\.4\)/);
  const secondaryControls = detailStyles.slice(
    detailStyles.indexOf('/* Keep the secondary detail controls'),
    detailStyles.indexOf('.detail__trailer {', detailStyles.indexOf('/* Keep the secondary detail controls')),
  );
  assert.doesNotMatch(secondaryControls, /color: var\(--signal\)/);
});

test('header exposes an active neon cue for every content navigation family', () => {
  assert.match(appTemplate, /routerLink="\/trading-courses"[\s\S]*?routerLinkActive="site-header__nav-link--active"/);
  assert.match(appTemplate, /routerLink="\/platform-courses"[\s\S]*?routerLinkActive="site-header__nav-link--active"/);
  assert.match(appTemplate, /routerLink="\/shows"[\s\S]*?routerLinkActive="site-header__nav-link--active"/);
  assert.match(appTemplate, /\[class\.site-header__nav-link--active\]="activeNav\(\) === 'home'"/);
});
