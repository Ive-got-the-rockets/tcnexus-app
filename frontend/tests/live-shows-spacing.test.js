const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const styles = fs.readFileSync(
  path.join(__dirname, '..', 'src/app/features/layout-style-3/layout-style-3.scss'),
  'utf8',
);

assert.match(
  styles,
  /\.style-row--shows\s*\{[\s\S]*?margin-top: -260px;/,
  'Shows must sit at the established 100px carousel gap below Live.',
);

console.log('live-to-shows spacing contract passes');
