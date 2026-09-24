const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const instructor = fs.readFileSync(path.join(root, 'includes', 'class-tcnexus-instructor-builder.php'), 'utf8');
const character = fs.readFileSync(path.join(root, 'includes', 'class-tcnexus-character-builder.php'), 'utf8');
const guard = fs.existsSync(path.join(root, 'assets', 'profile-builder-guard.js'))
  ? fs.readFileSync(path.join(root, 'assets', 'profile-builder-guard.js'), 'utf8')
  : '';

for (const [name, source] of [['Instructor', instructor], ['Character', character]]) {
  assert.match(source, /profile-builder-guard\.js/,
    `${name} builder should load the shared unsaved-changes guard`);
  assert.match(source, /tcn-profile-builder-form/,
    `${name} builder should mark its form for unsaved-change protection`);
  assert.match(source, /tcn-profile-unsaved-modal/,
    `${name} builder should render the Save or Discard modal`);
}

assert.match(guard, /beforeunload/);
assert.match(guard, /tcn-profile-unsaved-discard/);
assert.match(guard, /tcn-profile-unsaved-save/);
assert.match(guard, /form\.addEventListener\('input'/);
assert.match(guard, /form\.addEventListener\('change'/);
assert.match(guard, /dirty/);
assert.match(guard, /tinymce\.editors/);

console.log('Profile builder unsaved-change guard contract passes.');
