const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('wordpress-plugin/tcnexus-lms/includes/class-tcnexus-media-library.php', 'utf8');
assert.match(source, /_tcnexus_media_folder_key/);
assert.match(source, /unsorted/);
assert.match(source, /instructors/);
assert.match(source, /guests/);
assert.match(source, /characters/);
assert.match(source, /assign_attachment/);
assert.match(source, /organize_existing_media/);

console.log('media library folders contract passes');
