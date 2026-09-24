const assert = require('node:assert/strict');
const fs = require('node:fs');

const php = fs.readFileSync('wordpress-plugin/tcnexus-lms/includes/class-tcnexus-admin-menu.php', 'utf8');
const js = fs.readFileSync('wordpress-plugin/tcnexus-lms/assets/media-library.js', 'utf8');
const css = fs.readFileSync('wordpress-plugin/tcnexus-lms/assets/media-library-interactions.css', 'utf8');

assert.match(php, /ajax_move_media/);
assert.match(php, /ajax_media_details/);
assert.match(php, /ajax_delete_media/);
assert.match(php, /wp_delete_attachment/);
assert.match(js, /dragover/);
assert.match(js, /drop/);
assert.match(js, /details/);
assert.match(js, /delete/);
assert.match(js, /tcn-media-library-item__delete/);
assert.match(js, /viewBox="0 0 24 24"/);
assert.match(js, /copy/);
assert.match(js, /File URL/);
assert.match(css, /details/);
assert.match(css, /translateY\(-1px\)/);
assert.match(css, /delete/);
assert.match(php, /wp_get_attachment_url/);
assert.match(php, /wp_get_attachment_url/);

console.log('media library interactions contract passes');
