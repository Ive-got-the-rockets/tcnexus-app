const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

const utility = fs.readFileSync(path.join(root, 'src/app/core/profile-placeholders.ts'), 'utf8');
const sourceFiles = [
  'src/app/features/layout-style-3/layout-style-3.ts',
  'src/app/features/course-detail/course-detail.ts',
  'src/app/features/catalog/course-catalog.ts',
  'src/app/features/animation-style-2/animation-style-2.ts',
];

assert.match(utility, /PROFILE_PLACEHOLDER_URLS/);
assert.match(utility, /length\s*===\s*25|25/);
assert.match(utility, /profilePlaceholderUrl/);
assert.match(utility, /Array\.from\(\s*\{ length: PROFILE_PLACEHOLDER_COUNT \}/);

for (const file of sourceFiles) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  assert.match(source, /profilePlaceholderUrl/);
  assert.doesNotMatch(source, /i\.pravatar\.cc/);
}

console.log('profile placeholder contract passes');
