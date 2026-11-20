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
  assert.match(template, /currentLiveShows\(\)\.length > 0/);
  assert.match(source, /pastLiveShowCourses\s*=\s*computed/);
  assert.match(source, /const scheduledLiveShows = liveShows\.filter\(show => this\.hasLiveShowSchedule\(show\)\)/);
  assert.match(source, /const activeOrUpcomingLiveShows = orderedLiveShows\.filter\(show => !this\.hasLiveShowEnded\(show\)\)/);
  assert.match(source, /hasLiveShowEnded\(/);
  assert.match(template, /Past Live Shows/);
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

test('live schedule centers the moving calendar on the current time and retires completed events', () => {
  assert.match(source, /SCHEDULE_COLUMN_WIDTH\s*=\s*250/);
  assert.match(styles, /--schedule-column-width:\s*250px/);
  assert.match(source, /scheduleEventIsLive\(show: Course\)/);
  assert.match(source, /tone:\s*this\.scheduleEventIsLive\(show\)[\s\S]{0,40}'red'[\s\S]{0,40}'cyan'/);
  assert.doesNotMatch(source, /title: 'Live with Lex', offset: 150, duration: 120, tone: 'red'/);
  assert.match(source, /viewport\.scrollLeft\s*=\s*Math\.max\(0,\s*this\.scheduleNowOffset\(\)\s*-\s*viewport\.clientWidth\s*\/\s*2\)/);
  assert.match(template, /@if \(show\.tone === 'red'\)/);
});

test('weekly schedule only renders shows supplied by the Live Shows API', () => {
  assert.match(source, /const realShows = this\.liveShowCourses\(\)[\s\S]*?return realShows;/);
  assert.doesNotMatch(source, /Morning Brief|Tech Today|Industry Insights|Global Update|Innovation Hour|Weekend Digest|demo-/);
});

test('expired Live Shows cannot be selected by reactive featured routes', () => {
  assert.match(source, /activeOrUpcomingLiveShowCourses\s*=\s*computed/);
  assert.match(source, /liveOnly\(\)[\s\S]{0,120}\? this\.activeOrUpcomingLiveShowCourses\(\)/);
  assert.doesNotMatch(source, /liveOnly\(\)[\s\S]{0,120}\? this\.liveShowCourses\(\)/);
});

test('the Past Live Shows row follows Platform Courses without overlap', () => {
  assert.ok(template.indexOf('id="platform-courses-title"') < template.indexOf('id="past-live-shows-title"'));
  assert.match(styles, /\.style-row--platform\s*\+\s*\.style-row--past-live\s*\{\s*margin-top:\s*0;/);
});
