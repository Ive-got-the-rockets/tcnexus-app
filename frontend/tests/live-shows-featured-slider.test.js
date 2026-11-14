const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const component = fs.readFileSync(path.join(root, 'src/app/features/layout-style-3/layout-style-3.ts'), 'utf8');
const template = fs.readFileSync(path.join(root, 'src/app/features/layout-style-3/layout-style-3.html'), 'utf8');

assert.match(component, /liveShowCourses/);
assert.match(component, /\.\.\.this\.liveShowCourses\(\)/);
assert.match(component, /protected isLiveShow\(course: Course\): boolean/);
assert.match(component, /this\.router\.navigate\(\['\/live', String\(course\.id\)\]\)/);
assert.match(template, /@if \(!isLiveShow\(course\)\)/);

console.log('live shows featured slider contract passes');
