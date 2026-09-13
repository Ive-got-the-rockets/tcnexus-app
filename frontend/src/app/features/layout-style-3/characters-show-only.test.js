const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, 'layout-style-3.html'), 'utf8');

assert.match(source, /@if \(isShow\(course\)\) \{[\s\S]*?style-featured__characters/);
console.log('characters show-only contract passes');
