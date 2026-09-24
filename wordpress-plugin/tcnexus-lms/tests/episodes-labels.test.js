const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const builder = fs.readFileSync(path.join(__dirname, '..', 'includes', 'class-tcnexus-course-builder.php'), 'utf8');
const globalList = fs.readFileSync(path.join(__dirname, '..', 'includes', 'class-tcnexus-global-lessons.php'), 'utf8');
const globalLessonsJs = fs.readFileSync(path.join(__dirname, '..', 'assets', 'global-lessons.js'), 'utf8');
const globalLessonsCss = fs.readFileSync(path.join(__dirname, '..', 'assets', 'global-lessons.css'), 'utf8');

assert.match(builder, /\$lesson_label = self::is_show_mode\(\) \? 'Episode' : 'Lesson'/);
assert.match(builder, /\$lesson_label \. 's'/);
assert.match(builder, /\+ Add <\?php echo esc_html\( \$lesson_label \); \?>/);
assert.match(globalList, />Global Episodes List</);
assert.match(globalList, /data-tier-toggle/);
assert.match(globalList, /TIER_NONCE_ACTION/);
assert.match(globalList, /ajax_set_lesson_tier/);
assert.match(globalList, /render_lesson_guest_field\( 'guest_ids\[\]', \$lesson_guest_ids, \$guests, 'Lesson' \)/);
assert.match(globalList, /class="tcn-save-btn tcn-global-lesson-save"/);
assert.match(globalList, />Courses &amp; Shows</);
assert.match(globalList, />Lessons &amp; Episodes List</);
assert.match(globalList, />Lesson \/ Episode No\.</);
assert.match(globalList, />Course \/ Show Name</);
assert.match(globalList, /data-content-type/);
assert.match(globalList, /'tc_show' === \$course_info\['post_type'\]/);
assert.match(globalLessonsJs, /Pending Save/);
assert.match(globalLessonsJs, /markPending/);
assert.match(globalLessonsCss, /\.tcn-global-lesson-save\.is-pending/);

const builderGuestField = builder.slice(builder.indexOf('public static function render_lesson_guest_field'));
assert.match(builderGuestField, /Guest\(s\) for this/);
assert.match(builderGuestField, /Selected guest\(s\) from the dropdown will be added below\./);
