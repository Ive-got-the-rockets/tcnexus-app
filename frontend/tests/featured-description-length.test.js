const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'src/app/features/layout-style-3/layout-style-3.ts'), 'utf8');

assert.match(source, /descriptionNeedsMore\(value: string\): boolean \{\s*return this\.descriptionText\(value\)\.split\(' '\)\.filter\(Boolean\)\.length > 28;/,
  'featured descriptions need a Read More control only after 28 words');
assert.match(source, /return words\.length > 28 \? `\$\{words\.slice\(0, 28\)\.join\(' '\)\}…` : words\.join\(' '\);/,
  'featured descriptions need to be truncated to 28 words');

console.log('featured description length contract passes');
