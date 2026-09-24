const assert = require('node:assert/strict');
const fs = require('node:fs');

const builder = fs.readFileSync(
  require('node:path').join(__dirname, '..', 'includes', 'class-tcnexus-course-builder.php'),
  'utf8'
);
const postTypes = fs.readFileSync(
  require('node:path').join(__dirname, '..', 'includes', 'class-tcnexus-post-types.php'),
  'utf8'
);
const builderJs = fs.readFileSync(
  require('node:path').join(__dirname, '..', 'assets', 'course-builder.js'),
  'utf8'
);

assert.match(builder, /tcnexus-show-builder/);
assert.match(builder, /tc_show/);
assert.match(builder, /tcnexus_show_characters/);
assert.match(builder, /shows/);
assert.match(builder, /\$_GET\['builder_mode'\]/);
assert.match(postTypes, /register_post_type\( 'tc_show'/);
assert.match(builder, /tcn-course-language-remove-modal/);
assert.match(builder, /Everything under this language will be deleted/);
assert.match(builderJs, /tcn-course-language-remove-confirm/);
assert.match(builderJs, /removeLanguageInput\.value = pendingLanguage/);
assert.match(builderJs, /isShowBuilder/);
assert.match(builderJs, /var contentUnit = isShowBuilder \? 'Episodes' : 'lessons'/);
assert.match(builderJs, /including its levels and ' \+ contentUnit \+ '\.'/);
assert.doesNotMatch(builderJs, /window\.confirm\('Remove this language/);
