const assert = require('node:assert/strict');
const fs = require('node:fs');

const helper = fs.readFileSync('wordpress-plugin/tcnexus-lms/includes/class-tcnexus-profile-placeholders.php', 'utf8');
const instructorBuilder = fs.readFileSync('wordpress-plugin/tcnexus-lms/includes/class-tcnexus-instructor-builder.php', 'utf8');
const characterBuilder = fs.readFileSync('wordpress-plugin/tcnexus-lms/includes/class-tcnexus-character-builder.php', 'utf8');
const restApi = fs.readFileSync('wordpress-plugin/tcnexus-lms/includes/class-tcnexus-rest-api.php', 'utf8');

assert.match(helper, /PLACEHOLDER_COUNT\s*=\s*25/);
assert.match(helper, /assign_if_missing/);
assert.match(helper, /delete_post_meta/);
assert.match(instructorBuilder, /assign_if_missing\(\s*\$instructor_id/);
assert.match(characterBuilder, /assign_if_missing\(\s*\$character_id/);
assert.match(instructorBuilder, /get_saved_url\(\s*\$person->ID/);
assert.match(characterBuilder, /get_saved_url\(\s*\$character->ID/);
assert.match(restApi, /get_saved_url/);

console.log('profile placeholder assignment contract passes');
