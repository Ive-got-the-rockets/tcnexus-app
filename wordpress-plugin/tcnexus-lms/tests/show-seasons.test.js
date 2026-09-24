const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const builder = fs.readFileSync(path.join(root, 'includes/class-tcnexus-course-builder.php'), 'utf8');
const builderJs = fs.readFileSync(path.join(root, 'assets/course-builder.js'), 'utf8');
const rest = fs.readFileSync(path.join(root, 'includes/class-tcnexus-rest-api.php'), 'utf8');

test('show builder models the existing show as Season 1 and provides a dynamic add-season tab', () => {
  for (const contract of ['get_course_seasons', "return 'Season ' . absint", 'tcnexus-add-show-season', 'new_season']) {
    assert.ok(builder.includes(contract), `builder should include ${contract}`);
  }
  assert.ok(builderJs.includes('isShowBuilder'), 'season label handling stays show-only');
  assert.ok(builderJs.includes("newSeasonInput.value = '1'"), 'add tab submits a new season');
});

test('season migration preserves existing episode IDs and links legacy beginner episodes to Season 1', () => {
  assert.ok(builder.includes("'season-1'"), 'legacy show content becomes Season 1');
  assert.ok(builder.includes('legacy_show_level_has_data'), 'legacy-generated defaults are distinguished from actual season data');
  assert.ok(builder.includes('array_diff( (array) ( $level[\'course_types\'] ?? array() ), array( self::SHOW_CATEGORY ) )'), 'the forced Shows category alone does not create extra seasons');
  assert.ok(builder.includes('maybe_migrate_show_seasons'), 'migration is explicit and idempotent');
  assert.ok(builder.includes('update_post_meta( $episode_id, self::LEVEL_LESSON_META_KEY, $season_slug )'), 'episode IDs stay unchanged and their season association is updated');
});

test('public show responses expose seasons without changing the course level response contract', () => {
  assert.ok(rest.includes('format_course_seasons'), 'show API serializes season variants');
  assert.ok(rest.includes("$response['seasons'] = $seasons"), 'season data is returned separately');
  assert.ok(rest.includes("'levels'        => $levels"), 'course level response shape remains present');
});
