const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const mockServer = fs.readFileSync(path.join(root, 'mock-api/server.js'), 'utf8');
const detailPage = fs.readFileSync(path.join(root, 'src/app/features/course-detail/course-detail.ts'), 'utf8');
const restApi = fs.readFileSync(path.join(root, '../wordpress-plugin/tcnexus-lms/includes/class-tcnexus-rest-api.php'), 'utf8');

assert.match(mockServer, /landing_background: course\.landing_background \?\? null/,
  'detail responses must preserve a carousel item\'s landing background');
assert.match(mockServer, /detail\.content_type === 'tc_show'/,
  'only local Show details may replace the matching preview fixture');
assert.match(detailPage, /course\.image \?\? course\.landing_background \?\? course\.thumbnail/,
  'single pages must use the landing background when a course image is absent');
assert.match(restApi, /'content_type'\s*=>\s*\$course->post_type/,
  'WordPress detail responses must identify their content type');

console.log('single-page background data contract passes');
