const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const routes = fs.readFileSync(path.join(root, 'src/app/app.routes.ts'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'src/app/features/live-player/live-player.scss'), 'utf8');

assert.match(routes, /\{ path: 'live\/:id', component: LivePlayerPage \}/,
  'the Live Show detail route must keep the standard site header');
assert.match(styles, /\.live-detail-page \{[\s\S]*?padding: 150px clamp\(1\.5rem, 28px, 28px\) 60px;/,
  'the Live Show detail page must leave room below the standard header');

console.log('live show detail header contract passes');
