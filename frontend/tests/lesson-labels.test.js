const assert = require('node:assert/strict');
const fs = require('node:fs');

const style3Template = fs.readFileSync('frontend/src/app/features/layout-style-3/layout-style-3.html', 'utf8');
const detailTemplate = fs.readFileSync('frontend/src/app/features/course-detail/course-detail.html', 'utf8');
const detailComponent = fs.readFileSync('frontend/src/app/features/course-detail/course-detail.ts', 'utf8');
const detailStyles = fs.readFileSync('frontend/src/app/features/course-detail/course-detail.scss', 'utf8');
const catalogStyles = fs.readFileSync('frontend/src/app/features/catalog/course-catalog.scss', 'utf8');
const layout3Styles = fs.readFileSync('frontend/src/app/features/layout-style-3/layout-style-3.scss', 'utf8');

assert.match(style3Template, /\{\{ lessonListLabel\(\) \}\}/);
assert.doesNotMatch(style3Template, /<h3>Episodes<\/h3>/);
assert.match(detailComponent, /lessonListLabel\(course: CourseDetail/);
assert.match(detailTemplate, /\{\{ lessonListLabel\(c\) \}\}/);
assert.doesNotMatch(detailTemplate, /<h2[^>]*>Episodes<\/h2>/);
assert.match(detailStyles, /\.lesson-row__order[\s\S]*?width: 2\.5rem[\s\S]*?font-family: Inter, sans-serif[\s\S]*?font-size: 2rem[\s\S]*?font-weight: 500/);
assert.match(catalogStyles, /\.lesson-row__order[\s\S]*?width: 2\.5rem[\s\S]*?font-family: Inter, sans-serif[\s\S]*?font-size: 2rem[\s\S]*?font-weight: 500/);
assert.match(catalogStyles, /\.episode-panel \.lesson-row[\s\S]*?padding-left: 9\.6px/);
assert.match(catalogStyles, /\.episode-panel \.lesson-row__order[\s\S]*?font-family: Inter, sans-serif[\s\S]*?font-size: 2rem[\s\S]*?font-weight: 500/);
assert.match(layout3Styles, /\.lesson-row__order[\s\S]*?width: 2\.5rem[\s\S]*?font-family: Inter, sans-serif[\s\S]*?font-size: 2rem[\s\S]*?font-weight: 500/);
assert.match(catalogStyles, /\.episode-panel \.lesson-row[\s\S]*?padding-left: 9\.6px/);

console.log('course lesson labels contract passes');
