const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const styles = fs.readFileSync(path.join(__dirname, 'layout-style-3.scss'), 'utf8');

assert.match(
  styles,
  /@media \(min-width: 1600px\)[\s\S]*?\.style-card\s*\{\s*width: 278px;/,
  'Desktop carousel cards must be 278px wide.',
);
assert.match(styles, /--card-gap:\s*24px;/, 'Carousel card gap must remain 24px.');

console.log('carousel card sizing contract passes');
