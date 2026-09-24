const assert = require('node:assert/strict');
const fs = require('node:fs');

const root = 'wordpress-plugin/tcnexus-lms';
const builder = fs.readFileSync(`${root}/includes/class-tcnexus-course-builder.php`, 'utf8');
const scripts = fs.readFileSync(`${root}/assets/course-builder.js`, 'utf8');
const styles = fs.readFileSync(`${root}/assets/course-builder.css`, 'utf8');

assert.match(styles, /\.tcn-panel\[id\$="-basics"\] > \.tcn-row \+ \.tcn-field[\s\S]*margin-top: 25px;/);
assert.match(styles, /\.tcn-field__label\[for\^="course_content_"\]\s*\{[^}]*margin-bottom: 15px;[^}]*\}/);
assert.match(styles, /\.tcn-field__label\[for\^="course_content_"\]\s*\{[^}]*position: relative;[^}]*top: 15px;[^}]*\}/);
assert.match(scripts, /courseTypeIsSet/);
assert.match(scripts, /You must set a course type before leaving the Course Builder/);
assert.match(scripts, /mustSetCourseType/);
assert.match(builder, /tcn-unsaved-modal-course-type-close/);

console.log('course type required contract passes');
