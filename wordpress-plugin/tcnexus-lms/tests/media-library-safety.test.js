const assert = require('node:assert/strict');
const fs = require('node:fs');

const library = fs.readFileSync('wordpress-plugin/tcnexus-lms/includes/class-tcnexus-media-library.php', 'utf8');
const cropper = fs.readFileSync('wordpress-plugin/tcnexus-lms/includes/class-tcnexus-media.php', 'utf8');

assert.doesNotMatch(library, /wp_delete_attachment|wp_delete_file/);
assert.match(library, /Archived Content/);
assert.match(cropper, /wp_update_attachment_metadata\(\s*\$new_id,\s*\$metadata\s*\);[\s\S]*wp_delete_attachment/);

console.log('media library safety contract passes');
