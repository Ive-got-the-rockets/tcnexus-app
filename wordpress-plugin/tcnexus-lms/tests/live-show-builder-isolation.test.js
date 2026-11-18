const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const includes = path.join(__dirname, '..', 'includes');
const liveBuilder = fs.readFileSync(path.join(includes, 'class-tcnexus-live-show-builder.php'), 'utf8');
const liveShows = fs.readFileSync(path.join(includes, 'class-tcnexus-live-shows.php'), 'utf8');
const plugin = fs.readFileSync(path.join(__dirname, '..', 'tcnexus-lms.php'), 'utf8');
const restApi = fs.readFileSync(path.join(includes, 'class-tcnexus-rest-api.php'), 'utf8');

assert.match(liveBuilder, /class TCNexus_Live_Show_Builder/);
assert.match(liveBuilder, /SHOW_PAGE_SLUG/);
assert.match(liveShows, /array\( 'TCNexus_Live_Show_Builder', 'render' \)/);
assert.match(plugin, /class-tcnexus-live-show-builder\.php/);
assert.match(liveShows, /live-show-builder\.css/);
assert.match(liveShows, /live-show-builder\.js/);
assert.match(liveShows, /'tcnexus-crop-rect'/, 'Live Shows loads the crop helper required by its image picker');
assert.match(liveShows, /array\( 'tcnexus-crop-rect', 'tcnexus-navigation-guard' \)/, 'Live Show Builder loads after its isolated crop and navigation helpers');
assert.match(liveShows, /filemtime\( TCNEXUS_LMS_DIR \. 'assets\/live-show-builder\.js' \)/, 'Live Show Builder receives fresh image-picker code after updates');
assert.match(liveBuilder, /self::is_show_mode\(\) \? 'Host\(s\) & Guest\(s\)' : 'Instructors'/);
assert.match(liveBuilder, /tcn-live-add-host/);
const liveBuilderJs = fs.readFileSync(path.join(__dirname, '..', 'assets', 'live-show-builder.js'), 'utf8');
assert.match(liveBuilderJs, /list\.addEventListener\('click'/);
assert.match(liveBuilder, /tcnexus_save_live_show_builder/);
assert.match(plugin, /admin_post_tcnexus_save_live_show_builder/);
assert.match(liveBuilder, /Host\(s\) & Guest\(s\)/);
assert.match(liveBuilderJs, /data-guest-picker/);
assert.match(liveBuilder, /LIVE_STREAM_META_KEY\s*=\s*'_tcnexus_vimeo_live_event_id'/, 'Live Shows keep their Vimeo event separately from course lesson video IDs');
assert.match(liveBuilder, /Live Stream/, 'Live Show Builder contains the Live Stream panel');
assert.match(liveBuilder, /Vimeo Live Event ID/, 'Live Stream panel asks for the single Vimeo event value');
assert.match(liveBuilder, /name="vimeo_live_event_id"/, 'Live Stream panel submits the Vimeo event ID');
assert.match(liveBuilder, /update_post_meta\( \$course_id, self::LIVE_STREAM_META_KEY/, 'saving a Live Show persists its Vimeo event ID');
assert.match(liveBuilder, /if \( ! \$is_show \) : \?>\s*<!--[\s\S]*Lessons/, 'Episodes remain available only to the regular Show/Course builder, not Live Shows');
assert.match(liveBuilder, /\$submitted_title\s*=\s*sanitize_text_field\( wp_unslash\( \$_POST\['course_title'\] \?\? '' \) \)/, 'Live Show save reads the visible title field');
assert.match(liveBuilder, /\$is_show\s*&&\s*''\s*!==\s*\$submitted_title\s*\?\s*\$submitted_title/, 'Live Shows prefer the visible title over a stale hidden title copy');
assert.match(liveBuilder, /'post_title'\s*=>\s*\$is_show\s*\?\s*\(\s*\$base_title/, 'Live Shows write their post title directly from the visible title');
const livePickerMethod = liveBuilder.slice(
  liveBuilder.indexOf('private static function render_live_person_picker'),
  liveBuilder.indexOf('private static function render_live_person_modal')
);
assert.doesNotMatch(livePickerMethod, /<form\b/, 'The Add Host modal form must not be rendered inside the Live Show save form');
assert.match(liveBuilder, /private static function render_live_person_modal\(\)[\s\S]*?<form\b/, 'The Add Host modal keeps its own form outside the builder form');
assert.doesNotMatch(liveBuilderJs, /courseForm\.submit\(\)/, 'Live Shows use the normal submit event instead of bypassing it');
assert.match(liveBuilderJs, /courseForm\.addEventListener\('formdata',[\s\S]*allowCourseNavigation\s*=\s*true/, 'Live Show saves mark their native form submission as safe before the page unloads');
assert.match(restApi, /'\/live-shows'/, 'Published Live Shows have their own public catalogue endpoint');
assert.match(restApi, /get_catalog_items\( 'tc_live_show'/, 'The Live Shows endpoint reads the separate Live Show post type');
