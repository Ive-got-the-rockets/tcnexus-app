const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const styles = fs.readFileSync(
  path.join(__dirname, '..', 'src/app/features/layout-style-3/layout-style-3.scss'),
  'utf8',
);

assert.match(
  styles,
  /\.style-row--live\s*\{[^}]*z-index: 12;/,
  'The Live row must layer above the following Shows carousel when a Live card expands.',
);

console.log('live show card layering contract passes');
