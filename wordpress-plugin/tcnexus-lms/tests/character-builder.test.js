const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const plugin = fs.readFileSync(path.join(root, 'tcnexus-lms.php'), 'utf8');
const postTypes = fs.readFileSync(path.join(root, 'includes', 'class-tcnexus-post-types.php'), 'utf8');
const courseBuilder = fs.readFileSync(path.join(root, 'includes', 'class-tcnexus-course-builder.php'), 'utf8');
const characterBuilder = fs.existsSync(path.join(root, 'includes', 'class-tcnexus-character-builder.php'))
  ? fs.readFileSync(path.join(root, 'includes', 'class-tcnexus-character-builder.php'), 'utf8')
  : '';

assert.match(postTypes, /register_post_type\( 'tc_character'/,
  'characters should have a dedicated post type');
assert.match(plugin, /class-tcnexus-character-builder\.php/,
  'the character builder should be loaded by the plugin');
assert.match(plugin, /TCNexus_Character_Builder', 'register'/,
  'the character builder should register its Shows submenu');
assert.match(characterBuilder, /add_submenu_page\(\s*TCNexus_Course_Builder::SHOW_PAGE_SLUG/s,
  'Characters should appear under the Shows menu');
assert.match(characterBuilder, /tcnexus_save_character/,
  'the character panel should save character profiles');
assert.match(characterBuilder, /tcnexus_delete_character/,
  'the character panel should support deleting character profiles');
assert.match(courseBuilder, /'post_type'\s*=>\s*'tc_character'/,
  'Shows should load characters from the dedicated character pool');

console.log('Character builder contract passes.');
