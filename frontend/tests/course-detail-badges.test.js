import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const template = readFileSync(new URL('../src/app/features/course-detail/course-detail.html', import.meta.url), 'utf8');
const component = readFileSync(new URL('../src/app/features/course-detail/course-detail.ts', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../src/app/features/course-detail/course-detail.scss', import.meta.url), 'utf8');

test('single-page course levels are displayed above the description as selectable badges', () => {
  assert.ok(template.indexOf('class="detail__level-current"') < template.indexOf('class="detail__description"'));
  assert.match(template, /class="detail__type-badge detail__level-badge"/);
  assert.match(template, /aria-pressed.*selectedLevel\(\)/);
  assert.match(styles, /\.detail__level-current[\s\S]*color: #fff;[\s\S]*font-weight: 700;/);
});

test('single-page active level labels come from the selected course level', () => {
  assert.match(component, /protected selectedLevelLabel\(course: CourseDetail\): string/);
  assert.match(component, /protected activeVariant\(course: CourseDetail\)/);
  assert.match(component, /protected courseLevelOptions\(course: CourseDetail\)/);
});
