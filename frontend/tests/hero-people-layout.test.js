const assert = require('node:assert/strict');
const fs = require('node:fs');

const style3 = fs.readFileSync('frontend/src/app/features/layout-style-3/layout-style-3.scss', 'utf8');
const detail = fs.readFileSync('frontend/src/app/features/course-detail/course-detail.scss', 'utf8');

assert.match(style3, /\.style-featured__person-item\s*\{[^}]*flex-direction: row;[^}]*align-items: center;/);
assert.match(detail, /\.detail__person-item\s*\{[^}]*flex-direction: row;[^}]*align-items: center;/);

console.log('hero people layout contract passes');
