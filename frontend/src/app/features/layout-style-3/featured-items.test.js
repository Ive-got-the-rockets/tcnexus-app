const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, 'layout-style-3.ts'), 'utf8');

assert.doesNotMatch(source, /this\.courses\(\)\.filter\(course => !course\.course_types\.includes\('Platform'\)\)/);
assert.doesNotMatch(source, /courses\.filter\(course => !course\.course_types\.includes\('Platform'\)\)/);
assert.match(source, /const allCourseCandidates = courses\.filter\(course => !course\.course_types\.includes\('Shows'\)\)/,
  'the home featured rotation must include platform courses alongside trading courses');
assert.match(source, /previousKind === 'show'\s*\? allCourseCandidates/,
  'the featured rotation must choose from all courses after a show, including platform courses');
assert.doesNotMatch(source, /this\.tradingCourseItems\(\)\.filter\(course => course\.id !== featuredId\)/,
  'the featured trading course must remain in its carousel');
assert.doesNotMatch(source, /this\.shows\(\)\.filter\(show => show\.id !== featuredId\)/,
  'the featured show must remain in its carousel');
assert.doesNotMatch(source, /this\.platformCourseItems\(\)\s*\.filter\(course => course\.id !== featuredId\)/,
  'the featured platform course must remain in its carousel');

console.log('featured slider and carousel visibility contracts pass');
