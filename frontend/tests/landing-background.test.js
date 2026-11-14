const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const styles = fs.readFileSync(
  path.join(__dirname, '..', 'src/app/features/layout-style-3/layout-style-3.scss'),
  'utf8',
);

assert.match(styles, /:host\s*\{[\s\S]*?background: #090a09;/);
assert.match(styles, /\.style-page\s*\{[\s\S]*?background: #090a09;/);

console.log('landing background contract passes');
