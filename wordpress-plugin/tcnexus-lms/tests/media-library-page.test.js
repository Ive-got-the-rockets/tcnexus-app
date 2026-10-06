const assert = require('node:assert/strict');
const fs = require('node:fs');

const menu = fs.readFileSync('wordpress-plugin/tcnexus-lms/includes/class-tcnexus-admin-menu.php', 'utf8');
const folders = fs.readFileSync('wordpress-plugin/tcnexus-lms/includes/class-tcnexus-media-library.php', 'utf8');
assert.match(menu, /tcnexus-media-library/);
assert.match(menu, /Media Library/);
assert.match(menu, /Courses/);
assert.match(menu, /Shows/);
assert.doesNotMatch(menu, /Courses &amp; Shows/);
assert.match(folders, /Instructors/);
assert.match(folders, /Guests/);
assert.match(folders, /Characters/);
assert.match(menu, /Unsorted/);
assert.match(menu, /Upload Media/);
assert.match(menu, /render_media_folder_tree/);
assert.match(menu, /data-folder-toggle/);
assert.match(menu, /seasons/);
assert.match(menu, /redirect_native_media_library/);
const picker = fs.readFileSync('wordpress-plugin/tcnexus-lms/assets/course-builder.js', 'utf8');
assert.match(picker, /openOrganizedMediaLibrary/);
assert.doesNotMatch(picker, /frame\s*=\s*wp\.media\(/);
assert.match(folders, /content-\(course\|show\)/);

console.log('media library page contract passes');
