const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const styles = fs.readFileSync(path.join(__dirname, 'layout-style-3.scss'), 'utf8');

assert.match(
  styles,
  /@media \(min-width: 1200px\)[\s\S]*?\.style-carousel__viewport\s*\{[\s\S]*?margin-left: calc\(-1 \* var\(--page-gutter\)\);[\s\S]*?width: calc\(100% \+ var\(--page-gutter\)\);/,
  'Desktop carousel viewport must extend to the window edge.',
);
assert.match(
  styles,
  /@media \(min-width: 1200px\)[\s\S]*?\.style-carousel__track\s*\{[\s\S]*?padding-inline-start: var\(--page-gutter\);/,
  'Desktop carousel track must preserve the first-card inset.',
);
assert.match(
  styles,
  /@media \(min-width: 1200px\)[\s\S]*?\.style-carousel__track\s*\{[\s\S]*?padding-inline-end: var\(--page-gutter\);/,
  'Desktop carousel track must preserve the matching last-card inset.',
);

console.log('left-edge carousel contract passes');
