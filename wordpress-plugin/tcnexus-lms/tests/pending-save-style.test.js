const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const scripts = fs.readFileSync(path.join(root, 'assets', 'course-builder.js'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'assets', 'course-builder.css'), 'utf8');

assert.match(scripts, /classList\.add\(['"]is-pending['"]\)/);
assert.match(styles, /#F09889/i);
assert.match(styles, /#tcnexus-save-course\.is-pending/);

console.log('pending save style contract passes');
