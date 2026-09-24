const assert = require('node:assert/strict');
const fs = require('node:fs');

const root = 'wordpress-plugin/tcnexus-lms';
const builder = fs.readFileSync(`${root}/includes/class-tcnexus-course-builder.php`, 'utf8');
const peopleBuilder = fs.readFileSync(`${root}/includes/class-tcnexus-instructor-builder.php`, 'utf8');
const scripts = fs.readFileSync(`${root}/assets/course-builder.js`, 'utf8');

assert.match(builder, /render_lesson_guest_field\([^;]*\$characters[^;]*'character'/s);
assert.match(builder, /Characters[^<]*for this/);
assert.ok(builder.includes('data-person-kind="<?php echo esc_attr( $person_kind ); ?>"'));
assert.match(builder, /LESSON_CHARACTERS_META_KEY/);
assert.match(builder, /data-role="character"/);
assert.ok(scripts.includes("quickRole === 'character'"));
assert.ok(scripts.includes("'Add Character'"));
assert.ok(peopleBuilder.includes("$is_character ? 'tc_character' : 'tc_instructor'"));

console.log('episode character picker contract passes');
