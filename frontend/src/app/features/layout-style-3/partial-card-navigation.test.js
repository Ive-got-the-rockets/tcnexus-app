const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const styles = fs.readFileSync(path.join(__dirname, 'layout-style-3.scss'), 'utf8');
assert.match(
  styles,
  /\.style-carousel__viewport::after\s*\{\s*background: transparent;\s*right: 0;\s*width: var\(--nav-partial-width, var\(--nav-panel-w\)\);/,
  'The desktop right-side background must match the visible partial card width.',
);
assert.match(
  styles,
  /\.style-carousel__viewport\s*\{[\s\S]*?&::before[\s\S]*?left: 0;[\s\S]*?width: var\(--nav-prev-width, var\(--nav-panel-w\)\);/,
  'The desktop left-side background must match the visible partial card width.',
);
assert.match(
  styles,
  /@media \(min-width: 1200px\)[\s\S]*?\.style-carousel__arrow--prev\s*\{[\s\S]*?left: calc\(-1 \* var\(--page-gutter\)\);[\s\S]*?border-radius: 0 var\(--card-radius\) var\(--card-radius\) 0;/,
  'The desktop previous navigation must sit flush to the viewport edge without rounding its outer edge.',
);

console.log('partial card navigation contract passes');
