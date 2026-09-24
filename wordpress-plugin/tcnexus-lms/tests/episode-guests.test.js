const assert = require('node:assert/strict');
const fs = require('node:fs');

const builder = fs.readFileSync('wordpress-plugin/tcnexus-lms/includes/class-tcnexus-course-builder.php', 'utf8');
const rest = fs.readFileSync('wordpress-plugin/tcnexus-lms/includes/class-tcnexus-rest-api.php', 'utf8');

assert.match(builder, /Guests for this episode/);
assert.match(builder, /_tcnexus_lesson_guest_ids/);
assert.match(builder, /guest_ids/);
assert.match(rest, /'guests'/);
console.log('episode guest contract passes');
