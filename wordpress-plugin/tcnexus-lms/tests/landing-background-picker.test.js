const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const builder = fs.readFileSync(path.join(root, 'includes', 'class-tcnexus-course-builder.php'), 'utf8');
const rest = fs.readFileSync(path.join(root, 'includes', 'class-tcnexus-rest-api.php'), 'utf8');
const media = fs.readFileSync(path.join(root, 'includes', 'class-tcnexus-media.php'), 'utf8');
const scripts = fs.readFileSync(path.join(root, 'assets', 'course-builder.js'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'assets', 'course-builder.css'), 'utf8');

assert.match(builder, /landing_background_id/);
assert.match(builder, /title_image_id/);
assert.match(builder, /Title Image/);
assert.match(builder, /600, 160/);
assert.match(rest, /title_image/);
assert.match(rest, /format_characters/);
assert.match(builder, /Landing Page Background Image/);
assert.match(builder, /8:3/);
assert.match(media, /tcn-media-add/);
assert.match(media, /From Media Library/);
assert.match(media, /From File/);
assert.match(scripts, /wp\.media/);
assert.match(scripts, /tcn-media-library/);
assert.match(styles, /tcn-media-picker__device/);

console.log('landing background picker contract passes');
