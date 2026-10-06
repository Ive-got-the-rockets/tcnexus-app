const assert = require('node:assert/strict');
const fs = require('node:fs');

const builder = fs.readFileSync('wordpress-plugin/tcnexus-lms/includes/class-tcnexus-course-builder.php', 'utf8');

assert.match(
  builder,
  /name="levels\[__LEVEL__\]\[lessons\]\[new\]\[__INDEX__\]\[description\]"[\s\S]*?<\/textarea>\s*<\/div>\s*<\/div>\s*<div class="tcn-lesson-card__row tcn-lesson-card__row--video">/,
  'new lesson template closes the top fields row before video controls'
);

console.log('course builder layout contract passes');
