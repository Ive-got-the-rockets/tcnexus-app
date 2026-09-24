const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const page = fs.readFileSync(path.join(root, 'includes', 'class-tcnexus-admin-menu.php'), 'utf8');
const theme = fs.readFileSync(path.join(root, 'includes', 'class-tcnexus-admin-theme.php'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'assets', 'admin-membership.css'), 'utf8');
const script = fs.existsSync(path.join(root, 'assets', 'admin-membership.js'))
  ? fs.readFileSync(path.join(root, 'assets', 'admin-membership.js'), 'utf8')
  : '';

assert.match(page, /tcn-membership-wrap/);
assert.match(page, /tcn-membership-header/);
assert.match(page, /tcn-membership-settings/);
assert.match(page, /tcn-membership-stats/);
assert.match(page, /tcn-membership-table/);
assert.match(page, /tcnexus_set_free_limit/);
assert.match(page, /tcnexus_set_tier_/);
assert.match(theme, /tcnexus-membership/);
assert.match(styles, /\.tcn-membership-table__actions \.button/);
assert.match(styles, /height:\s*34px/);
assert.match(styles, /background:\s*var\(--tcn-bg\)/);
assert.doesNotMatch(styles, /#2271b1|#0073aa/);
assert.match(page, /<button type="submit" class="button" disabled="disabled">Update tier<\/button>/);
assert.match(page, /tcn-membership-tier-picker/);
assert.match(page, /name="tier"/);
assert.doesNotMatch(page, /<select name="tier">/);
assert.match(theme, /admin-membership\.js/);
assert.match(script, /data-initial-tier/);
assert.match(script, /button\.disabled/);
assert.match(script, /data-tier-option/);

console.log('membership panel layout contract passes');
