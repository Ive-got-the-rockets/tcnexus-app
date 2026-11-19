const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const featuredTemplate = fs.readFileSync(path.join(root, 'src/app/features/layout-style-3/layout-style-3.html'), 'utf8');
const featuredStyles = fs.readFileSync(path.join(root, 'src/app/features/layout-style-3/layout-style-3.scss'), 'utf8');
const liveDetailTemplate = fs.readFileSync(path.join(root, 'src/app/features/live-player/live-player.html'), 'utf8');
const liveDetailStyles = fs.readFileSync(path.join(root, 'src/app/features/live-player/live-player.scss'), 'utf8');
const coursesService = fs.readFileSync(path.join(root, 'src/app/core/courses.service.ts'), 'utf8');

for (const template of [featuredTemplate, liveDetailTemplate]) {
  assert.match(template, /live-now-action/);
  assert.match(template, /LIVE NOW/);
  assert.match(template, /Click to watch/);
}

assert.match(featuredStyles, /style-live-now-action[\s\S]*100px/);
assert.match(featuredStyles, /style-live-now-action__title[\s\S]*35px/);
assert.match(featuredStyles, /style-live-now-action__hint[\s\S]*20px/);
assert.match(liveDetailStyles, /live-now-action[\s\S]*100px/);
assert.match(liveDetailStyles, /live-now-action__title[\s\S]*35px/);
assert.match(liveDetailStyles, /live-now-action__hint[\s\S]*20px/);
assert.match(coursesService, /environment\.production[\s\S]*Live with Brian/);
assert.match(coursesService, /includes\('live with brian'\)/);

console.log('live now action contract passes');
