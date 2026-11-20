const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const component = fs.readFileSync(path.join(root, 'src/app/features/layout-style-3/layout-style-3.ts'), 'utf8');
const template = fs.readFileSync(path.join(root, 'src/app/features/layout-style-3/layout-style-3.html'), 'utf8');

assert.match(component, /private openLiveShowDestination\(course: Course\): void/,
  'Live Show entry points must use one destination decision.');
assert.match(component, /if \(this\.isLiveNow\(course\)\)[\s\S]*?\['\/live-stream-layout'\][\s\S]*?liveShowId: String\(course\.id\)[\s\S]*?vimeoLiveEventId: course\.vimeo_live_event_id \|\| undefined/,
  'An active Live Show must open its own workspace with its identity and Vimeo event.');
assert.match(component, /void this\.router\.navigate\(\['\/live', String\(course\.id\)\]\)/,
  'Upcoming or finished Live Shows must keep their detail-page route.');
assert.match(component, /protected openLiveShow\(id: string \| number\): void[\s\S]*?this\.openLiveShowDestination\(show\)/,
  'Live carousel cards must apply the same destination decision.');
assert.match(component, /protected startWatching\(course: Course\): void[\s\S]*?this\.openLiveShowDestination\(course\)/,
  'Live watch buttons must apply the same destination decision.');
assert.match(component, /protected openCourse\(course: Course, event\?: Event\): void[\s\S]*?this\.openLiveShowDestination\(course\)/,
  'Featured Live Show images must apply the same destination decision.');
assert.match(template, /\(click\)=\"openLiveShow\(liveShow\.id\)\"/,
  'The whole Live carousel card must remain clickable.');

console.log('active Live Shows open their own video workspace from every entry point');
