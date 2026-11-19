const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const page = fs.readFileSync(path.join(root, 'src/app/features/live-player/live-player.ts'), 'utf8');
const template = fs.readFileSync(path.join(root, 'src/app/features/live-player/live-player.html'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'src/app/features/live-player/live-player.scss'), 'utf8');

assert.match(page, /guests:\s*catalogShow\.guests\s*\|\|\s*\[\]/,
  'a live detail page must retain the guests provided by the Live Shows API');
assert.match(template, /guest\.photo/,
  'a live detail page must show each guest photo');
assert.match(template, /guest\.name/,
  'a live detail page must show each guest name');
assert.doesNotMatch(styles, /\.live-detail-content\s*\{[^}]*background:/,
  'the live detail content container must not add its own background');

console.log('live show detail guests contract passes');
