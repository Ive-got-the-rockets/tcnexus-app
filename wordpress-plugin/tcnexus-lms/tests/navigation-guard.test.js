const assert = require('node:assert/strict');
const { isInternalBuilderNavigation } = require('../assets/navigation-guard');

assert.equal(
  isInternalBuilderNavigation(
    'https://example.test/wp-admin/admin.php?page=tcnexus-course-builder&tab=media',
    'https://example.test/wp-admin/admin.php?page=tcnexus-course-builder&tab=basics'
  ),
  true
);

assert.equal(
  isInternalBuilderNavigation(
    'https://example.test/wp-admin/admin.php?page=tcnexus-membership',
    'https://example.test/wp-admin/admin.php?page=tcnexus-course-builder'
  ),
  false
);
