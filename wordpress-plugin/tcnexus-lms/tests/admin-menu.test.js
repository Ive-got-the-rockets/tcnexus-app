const assert = require('node:assert/strict');
const fs = require('node:fs');

const root = 'wordpress-plugin/tcnexus-lms';
const courseBuilder = fs.readFileSync(`${root}/includes/class-tcnexus-course-builder.php`, 'utf8');
const globalLessons = fs.readFileSync(`${root}/includes/class-tcnexus-global-lessons.php`, 'utf8');
const animations = fs.readFileSync(`${root}/includes/class-tcnexus-animations-settings.php`, 'utf8');
const adminMenu = fs.readFileSync(`${root}/includes/class-tcnexus-admin-menu.php`, 'utf8');
const instructorBuilder = fs.readFileSync(`${root}/includes/class-tcnexus-instructor-builder.php`, 'utf8');
const postTypes = fs.readFileSync(`${root}/includes/class-tcnexus-post-types.php`, 'utf8');
const plugin = fs.readFileSync(`${root}/tcnexus-lms.php`, 'utf8');

assert.match(courseBuilder, /add_menu_page\([\s\S]*self::PAGE_SLUG[\s\S]*3\.1/s);
assert.match(courseBuilder, /'tcnexus-show-builder'[\s\S]*3\.2/s);
assert.match(globalLessons, /'tcnexus-global-lessons'[\s\S]*3\.3/s);
assert.match(adminMenu, /'tcnexus-membership'[\s\S]*3\.4/s);
assert.match(animations, /'tcnexus-animations'[\s\S]*3\.5/s);
assert.match(courseBuilder, /add_submenu_page\(\s*self::PAGE_SLUG[\s\S]*'Media Library'[\s\S]*array\( 'TCNexus_Admin_Menu', 'render_media_library_page' \)/s);
assert.match(courseBuilder, /add_submenu_page\(\s*self::PAGE_SLUG[\s\S]*'All Courses'[\s\S]*self::PAGE_SLUG/s);
assert.match(courseBuilder, /\$submenu\[ self::PAGE_SLUG \]\[\] = array\( 'Add New Course'[\s\S]*'admin\.php\?page=' \. self::PAGE_SLUG \. '&new=1'/s);
assert.match(courseBuilder, /\$submenu\[ self::PAGE_SLUG \]\[\] = array\( 'Course Types'[\s\S]*'edit-tags\.php\?taxonomy=course_type/s);
assert.match(instructorBuilder, /add_submenu_page\(\s*TCNexus_Course_Builder::PAGE_SLUG/s);
assert.match(postTypes, /'tc_course'[\s\S]*?'show_in_menu'\s*=>\s*false/s);
assert.match(adminMenu, /admin-menu\.css/);
assert.match(plugin, /enqueue_admin_menu_styles/);

console.log('admin menu contract passes');
