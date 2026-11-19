const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const appRoot = path.resolve(__dirname, '..', 'src', 'app', 'features', 'layout-style-3');
const source = fs.readFileSync(path.join(appRoot, 'layout-style-3.ts'), 'utf8');
const template = fs.readFileSync(path.join(appRoot, 'layout-style-3.html'), 'utf8');
const styles = fs.readFileSync(path.join(appRoot, 'layout-style-3.scss'), 'utf8');

test('homepage loads and renders the Live Shows carousel', () => {
  assert.match(source, /getLiveShows\(\)/);
  assert.match(source, /liveShows\s*=\s*signal<LiveShow\[\]>/);
  assert.match(template, /Live This Week/);
  assert.match(template, /liveShows\(\)\.length > 0/);
});

test('homepage retains the Live menu mode and countdown presentation', () => {
  assert.match(source, /LandingMode = 'home' \| 'trading' \| 'platform' \| 'shows' \| 'live'/);
  assert.match(source, /liveCountdown\(/);
  assert.match(template, /style-live-now-action/);
});

test('active Live Shows lead the carousel and featured content', () => {
  assert.match(source, /isLiveNow\(/);
  assert.match(source, /const aLive = this\.isLiveNow\(a\)/);
  assert.match(source, /const activeLiveShow = filtered\.find\(item => this\.isLiveNow\(item\)\)/);
  assert.match(template, /style-card__live-now/);
  assert.match(styles, /style-card__live-now[\s\S]*color: #ff3b30[\s\S]*16px/);
});
