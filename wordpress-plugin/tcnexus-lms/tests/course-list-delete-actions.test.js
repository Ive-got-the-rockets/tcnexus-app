const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const php = fs.readFileSync(path.join(root, 'includes', 'class-tcnexus-course-builder.php'), 'utf8');
const css = fs.readFileSync(path.join(root, 'assets', 'course-builder.css'), 'utf8');

assert.match(php, /tcn-course-view--compact[\s\S]*?render_list_actions/,
  'compact view should render its row actions');
assert.match(php, /tcn-course-view--detail[\s\S]*?render_list_actions/,
  'detail view should render its row actions');
assert.match(css, /\.tcn-course-table__actions[\s\S]*?justify-content:\s*flex-end/,
  'table actions should align to the end of each row');
assert.match(css, /\.tcn-course-table \.tcn-course-table__delete[\s\S]*?position:\s*static/,
  'table delete buttons should stay in row flow instead of floating');

console.log('Course list delete action layout checks passed.');
