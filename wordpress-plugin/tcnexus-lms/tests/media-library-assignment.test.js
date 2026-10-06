const assert = require('node:assert/strict');
const fs = require('node:fs');

const service = fs.readFileSync('wordpress-plugin/tcnexus-lms/includes/class-tcnexus-media-library.php', 'utf8');
const builder = fs.readFileSync('wordpress-plugin/tcnexus-lms/includes/class-tcnexus-course-builder.php', 'utf8');
const globalLessons = fs.readFileSync('wordpress-plugin/tcnexus-lms/includes/class-tcnexus-global-lessons.php', 'utf8');
const instructor = fs.readFileSync('wordpress-plugin/tcnexus-lms/includes/class-tcnexus-instructor-builder.php', 'utf8');
const character = fs.readFileSync('wordpress-plugin/tcnexus-lms/includes/class-tcnexus-character-builder.php', 'utf8');

assert.match(service, /assign_posted_media/);
assert.match(service, /assign_lesson_thumbnail/);
assert.match(builder, /assign_posted_media/);
assert.match(builder, /assign_lesson_thumbnail/);
assert.match(globalLessons, /assign_lesson_thumbnail/);
assert.match(instructor, /assign_attachment\(\s*\$photo_id/);
assert.match(character, /assign_attachment\(\s*\$photo_id/);

console.log('media library assignment contract passes');
