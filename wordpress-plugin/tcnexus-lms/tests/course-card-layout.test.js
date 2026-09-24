const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const builder = fs.readFileSync(path.join(root, 'includes', 'class-tcnexus-course-builder.php'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'assets', 'course-builder.css'), 'utf8');
const scripts = fs.readFileSync(path.join(root, 'assets', 'course-builder.js'), 'utf8');

assert.match(builder, /tcn-course-card__image/);
assert.match(builder, /tcn-course-card__badges/);
assert.match(builder, /tcn-course-card__details/);
assert.match(builder, /tcn-course-card__toggle/);
assert.match(builder, /get_course_languages/);
assert.match(styles, /\.tcn-course-card__details/);
assert.match(styles, /\.tcn-course-card\.is-expanded/);
assert.match(scripts, /tcn-course-card__toggle/);
assert.match(scripts, /classList\.toggle\(['"]is-expanded['"]\)/);
assert.match(builder, /tcn-course-view-switcher/);
assert.match(builder, /data-course-view="compact"/);
assert.match(builder, /tcn-course-table--detail/);
assert.match(styles, /tcn-course-view--compact/);
assert.match(styles, /tcn-course-table--detail/);
assert.match(scripts, /tcn-course-view-switcher/);
assert.match(scripts, /localStorage/);
assert.match(builder, /class="tcn-course-view-switcher__button is-active" data-course-view="detail"/);
assert.match(scripts, /var savedView = 'detail'/);

console.log('course card layout contract passes');
