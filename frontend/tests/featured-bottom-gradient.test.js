const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const styles = fs.readFileSync(
  path.join(__dirname, '..', 'src/app/features/layout-style-3/layout-style-3.scss'),
  'utf8',
);

assert.match(
  styles,
  /linear-gradient\(\s*to top,\s*#090a09 0%/,
  'The featured artwork must fade into the page background color at its bottom edge.',
);

console.log('featured bottom gradient contract passes');
