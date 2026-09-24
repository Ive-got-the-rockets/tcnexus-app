import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const template = readFileSync(new URL('../src/app/features/course-detail/course-detail.html', import.meta.url), 'utf8');
const component = readFileSync(new URL('../src/app/features/course-detail/course-detail.ts', import.meta.url), 'utf8');

test('single content pages expose conditional play, trailer, overview, and language actions', () => {
  assert.match(template, /class="detail__actions"/);
  assert.match(template, /class="detail__start"/);
  assert.match(template, /class="detail__trailer"/);
  assert.match(template, /class="detail__overview-btn"/);
  assert.match(template, /class="detail__language-trigger"/);
  assert.match(component, /protected startWatching\(\)/);
  assert.match(component, /protected openTrailer\(\)/);
  assert.match(component, /protected courseLanguages\(/);
});

test('single-page optional actions are guarded by content configuration', () => {
  assert.match(template, /@if \(c\.trailer_link\)/);
  assert.match(template, /@if \(c\.overview_link\)/);
});
