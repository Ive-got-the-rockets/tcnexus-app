const assert = require('node:assert/strict');
const fs = require('node:fs');

const media = fs.readFileSync('wordpress-plugin/tcnexus-lms/includes/class-tcnexus-media.php', 'utf8');

assert.match(media, /wp_insert_attachment\(\s*\$attachment,\s*\$cropped\s*\)/);
assert.match(media, /wp_generate_attachment_metadata\(\s*\$new_id,\s*\$cropped\s*\)/);
assert.match(media, /wp_delete_attachment\(\s*\$attachment_id,\s*true\s*\)/);

const insertedAt = media.indexOf('wp_insert_attachment');
const deletedAt = media.indexOf('wp_delete_attachment');
assert.ok(insertedAt >= 0 && deletedAt > insertedAt, 'original must be deleted after the cropped attachment is created');

console.log('media crop cleanup contract passes');
