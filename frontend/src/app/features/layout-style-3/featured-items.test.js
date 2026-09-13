const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, 'layout-style-3.ts'), 'utf8');

assert.doesNotMatch(source, /this\.courses\(\)\.filter\(course => !course\.course_types\.includes\('Platform'\)\)/);
assert.doesNotMatch(source, /courses\.filter\(course => !course\.course_types\.includes\('Platform'\)\)/);

console.log('featured slider sources contract passes');
