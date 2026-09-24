const assert = require('node:assert/strict');
const fs = require('node:fs');

const builder = fs.readFileSync('wordpress-plugin/tcnexus-lms/includes/class-tcnexus-course-builder.php', 'utf8');
const script = fs.readFileSync('wordpress-plugin/tcnexus-lms/assets/course-builder.js', 'utf8');

assert.match(builder, /<div class="tcn-lessons-card__header">[\s\S]*?<button type="button" class="tcn-btn-ghost tcn-add-lesson-btn">/);
assert.match(builder, /\+ Add <\?php echo esc_html\( \$lesson_label \); \?>/);
assert.match(script, /\.replace\(\/__LEVEL__\/g, currentLevel\)/);
assert.match(script, /addLessonBtns = document\.querySelectorAll\('\.tcn-add-lesson-btn'\)/);

console.log('level lesson add button contract passes');
