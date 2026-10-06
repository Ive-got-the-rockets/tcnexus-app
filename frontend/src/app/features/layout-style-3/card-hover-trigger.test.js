const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const styles = fs.readFileSync(path.join(__dirname, 'layout-style-3.scss'), 'utf8');

assert.match(
  styles,
  /\.style-card:has\(\.style-card__art:hover,\s*\.style-card__details:hover\)/,
  'Card expansion must remain active while the pointer moves from artwork into the details controls.',
);

console.log('card hover trigger contract passes');
