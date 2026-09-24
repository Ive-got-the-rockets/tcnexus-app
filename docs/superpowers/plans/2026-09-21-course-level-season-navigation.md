# Course-Level and Show-Season Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep course-level navigation intact while giving shows dynamic, independently editable seasons, preserving the existing show as Season 1, and exposing selected seasons on detail pages.

**Architecture:** Keep the course builder's three fixed levels unchanged. Branch Show Builder into a dynamic season collection stored per language; each season carries the same presentation metadata and an episode list, and episodes retain their post IDs while their season metadata is migrated. The REST response exposes season records and season-selected episode data; the detail page selects seasons from `?season=`.

**Tech Stack:** Angular 22, TypeScript, PHP/WordPress REST, vanilla builder JavaScript, Node built-in tests, PHP syntax checks.

---

### Task 1: Specify and test the season model

**Files:**
- Modify: `docs/superpowers/specs/2026-09-21-course-level-season-navigation-design.md`
- Create: `frontend/tests/show-seasons.test.js`
- Test: `frontend/tests/show-seasons.test.js`

- [ ] **Step 1: Add failing builder/API contract tests**

Assert Show Builder renders a Season 1 tab and an adjacent `+` add tab, that season identifiers are dynamic (not fixed to the course-level constants), and that the public API model contains named seasons while courses still use `configured_levels`.

- [ ] **Step 2: Run the focused test and confirm expected failure**

Run: `node --test frontend/tests/show-seasons.test.js`
Expected: FAIL because the current show builder still renders Beginner / Intermediate / Advanced tabs and the API has no seasons field.

### Task 2: Add show season persistence and safe legacy mapping

**Files:**
- Modify: `wordpress-plugin/tcnexus-lms/includes/class-tcnexus-course-builder.php`
- Test: `wordpress-plugin/tcnexus-lms/tests/show-seasons.test.js`

- [ ] **Step 1: Write regression assertions before production changes**

Check the season normalizer retains `season-1` data, labels it `Season 1`, appends a sequential next season, and leaves the course-level normalizer's fixed keys unchanged. Check migration only maps the legacy Beginner season/episode assignment into Season 1 and does not rewrite episode post IDs.

- [ ] **Step 2: Run and confirm tests fail for missing show-season behavior**

Run: `node --test wordpress-plugin/tcnexus-lms/tests/show-seasons.test.js`
Expected: FAIL on missing season normalizer/migration contract.

- [ ] **Step 3: Implement season collection helpers and migration**

For shows, normalize per-language `seasons` keyed by `season-N`, with stable label and episode association; initialize legacy show records as one `Season 1` populated from Beginner data. Preserve lesson IDs and ordering, and leave all course data handling on the existing fixed-level path. Make the migration idempotent and avoid deleting legacy metadata.

- [ ] **Step 4: Run regression tests and PHP syntax check**

Run: `node --test wordpress-plugin/tcnexus-lms/tests/show-seasons.test.js` and `php -l wordpress-plugin/tcnexus-lms/includes/class-tcnexus-course-builder.php`.
Expected: tests pass and PHP reports no syntax errors.

### Task 3: Render and save dynamic season tabs in Show Builder

**Files:**
- Modify: `wordpress-plugin/tcnexus-lms/includes/class-tcnexus-course-builder.php`
- Modify: `wordpress-plugin/tcnexus-lms/assets/course-builder.js`
- Modify: `wordpress-plugin/tcnexus-lms/assets/course-builder.css`
- Test: `wordpress-plugin/tcnexus-lms/tests/show-seasons.test.js`

- [ ] **Step 1: Add failing markup/behavior assertions**

Verify show-mode tab markup iterates stored seasons, includes an adjacent `+` control and active season hidden field, and does not render the fixed course-level include checkboxes. Verify course-mode retains its existing level tabs.

- [ ] **Step 2: Confirm the focused regression test fails**

Run: `node --test wordpress-plugin/tcnexus-lms/tests/show-seasons.test.js`
Expected: FAIL on current fixed show tabs.

- [ ] **Step 3: Implement dynamic season editor controls**

In show mode, render each stored season as a tab and `+` as a submit action that initializes the next sequential empty season and returns to it. Store the active season via a show-only hidden field/query parameter. Make season tab changes switch their matching panels and filter episode rows by season. Keep course tabs and language switching unchanged. Save episode metadata against `season-N` in show mode.

- [ ] **Step 4: Run focused tests and syntax checks**

Run: `node --test wordpress-plugin/tcnexus-lms/tests/show-seasons.test.js`; run PHP lint on the modified builder; check the modified JavaScript parses with `node --check`.
Expected: all focused checks pass.

### Task 4: Expose selected seasons through REST and Angular types

**Files:**
- Modify: `wordpress-plugin/tcnexus-lms/includes/class-tcnexus-rest-api.php`
- Modify: `frontend/src/app/core/models.ts`
- Modify: `frontend/mock-api/server.js`
- Test: `frontend/tests/show-seasons.test.js`

- [ ] **Step 1: Add failing response/type contract assertions**

Assert show detail data exposes season labels, keys, configured state, and per-season episodes; course responses continue exposing levels. Assert a selected season can be identified separately from the default Season 1.

- [ ] **Step 2: Confirm the focused test fails**

Run: `node --test frontend/tests/show-seasons.test.js`
Expected: FAIL because the API and TypeScript models currently expose levels only.

- [ ] **Step 3: Implement show season response and model**

Serialize the builder's season records and query episodes by show, language, and `season-N`; include the default/selected season and all configured season labels for menus. Extend TypeScript with a season type and optional season fields without widening or changing course-level types. Make mock show records exercise two seasons while other catalog data remains unchanged.

- [ ] **Step 4: Verify focused checks**

Run: `node --test frontend/tests/show-seasons.test.js`; `php -l wordpress-plugin/tcnexus-lms/includes/class-tcnexus-rest-api.php`; `node --check frontend/mock-api/server.js`.
Expected: all checks pass.

### Task 5: Add course-level and show-season navigation to detail pages

**Files:**
- Modify: `frontend/src/app/features/course-detail/course-detail.ts`
- Modify: `frontend/src/app/features/course-detail/course-detail.html`
- Modify: `frontend/src/app/features/course-detail/course-detail.scss`
- Modify: `frontend/src/app/features/layout-style-3/layout-style-3.ts`
- Test: `frontend/tests/course-detail-level-season-navigation.test.js`

- [ ] **Step 1: Write failing navigation tests**

Cover level and season option filtering (active option omitted), course-versus-show heading labels, selection and `season` query parameter, invalid season fallback, and hidden selector when only one season/level exists.

- [ ] **Step 2: Confirm focused tests fail**

Run: `node --test frontend/tests/course-detail-level-season-navigation.test.js`
Expected: FAIL because the detail view currently has no season selector/query selection.

- [ ] **Step 3: Implement selected level/season detail view**

Read the route's query parameters, use the selected language's matching season/level variant, render the current variant title and episodes, and navigate between available options while omitting the active option. Keep existing language behavior independent. Render the approved white Inter 700 course-level text above the description and use season label in the show episode heading; do not add a show artwork badge.

- [ ] **Step 4: Verify standard and Style 3 behavior**

Run: `node --test frontend/tests/course-detail-level-season-navigation.test.js frontend/tests/course-detail-badges.test.js frontend/tests/lesson-labels.test.js`; then run the full frontend test suite and Angular production build.
Expected: all tests pass and the build succeeds without new warnings.

### Task 6: End-to-end verification and review

**Files:**
- Review only: all files above, plus `docs/superpowers/specs/2026-09-21-course-level-season-navigation-design.md`

- [ ] **Step 1: Run plugin and frontend checks**

Run all frontend Node tests, `npm run build --prefix frontend`, and `php -l` on each changed PHP file. Confirm existing course builder and course detail behavior still works and season labels never appear in course-level controls.

- [ ] **Step 2: Inspect diff and report remaining environment-dependent checks**

Review only files changed for this feature; do not stage or commit unrelated pre-existing workspace edits. If WordPress runtime testing is unavailable, state that limitation and report the static/API tests run.
