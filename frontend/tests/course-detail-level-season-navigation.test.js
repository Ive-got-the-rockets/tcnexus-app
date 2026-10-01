import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const template = readFileSync(new URL('../src/app/features/course-detail/course-detail.html', import.meta.url), 'utf8');
const component = readFileSync(new URL('../src/app/features/course-detail/course-detail.ts', import.meta.url), 'utf8');
const models = readFileSync(new URL('../src/app/core/models.ts', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../src/app/features/course-detail/course-detail.scss', import.meta.url), 'utf8');

test('course detail exposes Level menu, current-variant heading, and alternate show season menu', () => {
  assert.ok(template.includes('detail__level-trigger'), 'course Level trigger is rendered');
  assert.ok(template.includes('detail__season-menu'), 'show season options can be selected from the episode heading');
  assert.ok(template.includes('activeLessons(c)'), 'episode rows use the active variant');
  assert.ok(component.includes('chooseSeason'), 'season choice updates detail state');
  assert.ok(component.includes("queryParams: { level: option.slug, season: null }"), 'level choice persists in the level query parameter');
  assert.ok(component.includes("queryParams: { season: option.slug, level: null }"), 'season choice persists in the season query parameter');
  assert.ok(component.includes('option.slug !== this.selectedLevel()'), 'active level is excluded from alternate options');
  assert.ok(component.includes('option.slug !== this.selectedSeason()'), 'active season is excluded from alternate options');
});

test('season response types carry independent episode lists', () => {
  assert.ok(models.includes('export interface ShowSeason'), 'show season has its own response model');
  assert.ok(models.includes('seasons?: Record<string, ShowSeason>'), 'detail response exposes a season map');
});

test('detail menus use the standard white hover treatment and rotate the open heading cue', () => {
  assert.match(styles, /\.detail__language--open \.detail__language-trigger\s*\{\s*color:\s*#fff;/);
  assert.match(styles, /\.detail__language-menu button:hover[\s\S]*background:\s*#fff;[\s\S]*color:\s*#33373D;/);
  assert.match(styles, /\.detail__level-menu button:hover[\s\S]*background:\s*#fff;[\s\S]*color:\s*#33373D;/);
  assert.match(styles, /\.detail__heading-picker--open \.detail__heading-trigger svg[\s\S]*transform:\s*translateY\(4px\) rotate\(-90deg\)/);
});

test('course level options honor enabled payloads and use canonical level labels', () => {
  assert.match(component, /Boolean\(levels\[slug\]\?\.enabled\)/);
  assert.match(component, /label: labels\[slug\]/);
});

test('level and season menus include and highlight the active option', () => {
  assert.match(template, /@for \(level of courseLevelOptions\(c\); track level\.slug\)/);
  assert.match(template, /\[attr\.aria-selected\]="selectedLevel\(\) === level\.slug"/);
  assert.match(template, /@for \(season of showSeasonOptions\(c\); track season\.slug\)/);
  assert.match(template, /\[attr\.aria-selected\]="selectedSeason\(\) === season\.slug"/);
  assert.match(styles, /\.detail__level-menu button\[aria-selected='true'\][\s\S]*background:\s*#fff;[\s\S]*color:\s*#33373D;/);
  assert.match(styles, /\.detail__heading-level-menu button\[aria-selected='true'\][\s\S]*background:\s*#fff;[\s\S]*color:\s*#33373D;/);
  assert.match(styles, /\.detail__season-menu button\[aria-selected='true'\][\s\S]*background:\s*#fff;[\s\S]*color:\s*#33373D;/);
});
