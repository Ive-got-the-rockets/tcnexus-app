const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('wordpress-plugin/tcnexus-lms/includes/class-tcnexus-course-builder.php', 'utf8');

assert.match(source, /\$lesson_label = self::is_show_mode\(\) \? 'Episode' : 'Lesson'/);
assert.match(source, /Save <\?php echo esc_html\( \$lesson_label \); \?>/);
assert.match(source, /Save and Add New <\?php echo esc_html\( \$lesson_label \); \?>/);
assert.match(source, /\+ Add <\?php echo esc_html\( \$lesson_label \); \?>/);
assert.match(source, /<span class="tcn-slug-prefix"><\?php echo esc_html\( \$is_show \? '\/shows\/' : '\/courses\/' \); \?><\/span>/);
console.log('course lesson labels contract passes');
