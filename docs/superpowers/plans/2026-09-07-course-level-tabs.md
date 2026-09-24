# Course Level Tabs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single course-level selector with independent Beginner, Intermediate, and Advanced course versions stored under one course card, including separate lesson lists and level-aware API data.

**Architecture:** Keep one `tc_course` post per front-end card. Store each level's course fields in `_tcnexus_course_levels` as a validated associative array, and tag lessons with `_tcnexus_course_level`. Existing fields and untagged lessons migrate to Beginner. The REST API exposes the new level map while retaining legacy top-level fields for compatibility.

**Tech Stack:** WordPress PHP plugin, WordPress post meta/taxonomy APIs, vanilla admin JavaScript/CSS, Angular TypeScript templates and models, existing WordPress REST API.

---

## File map

- Modify `wordpress-plugin/tcnexus-lms/includes/class-tcnexus-course-builder.php`: define level helpers, render the three level tabs, namespace level fields and lesson rows, save each level, and migrate legacy data.
- Modify `wordpress-plugin/tcnexus-lms/includes/class-tcnexus-rest-api.php`: serialize configured level versions, level-specific lessons, and compatibility fields.
- Modify `wordpress-plugin/tcnexus-lms/assets/course-builder.js`: switch visible level panels, keep hidden panels synchronized with the unsaved-change guard, and scope add/remove lesson behavior to the active level.
- Modify `wordpress-plugin/tcnexus-lms/assets/course-builder.css`: style the level tabs, read-only level label, and level-specific lesson panels without changing the existing visual system.
- Modify `wordpress-plugin/tcnexus-lms/tcnexus-lms.php`: bump the plugin asset version and register a one-time migration hook if needed.
- Modify `frontend/src/app/core/models.ts`: add the level-version and level-badge types while keeping current course fields optional-compatible.
- Modify `frontend/src/app/features/animation-style-2/animation-style-2.html`, `.ts`, and `.scss`: expose configured level badges on cards, expanded cards, and the course-preview modal without changing the current card layout or badge treatment.
- Add `docs/superpowers/specs/2026-09-07-course-level-tabs-design.md` as the approved design record.

### Task 1: Add shared level data helpers and one-time migration

**Files:**
- Modify `wordpress-plugin/tcnexus-lms/includes/class-tcnexus-course-builder.php`
- Modify `wordpress-plugin/tcnexus-lms/tcnexus-lms.php`

- [ ] **Step 1: Define the canonical level map and field defaults.**

Add `LEVELS` with `beginner`, `intermediate`, and `advanced`, plus helper methods that return an empty level object with keys for `enabled`, `title`, `content`, `course_types`, `language`, `image_desktop_id`, `image_mobile_id`, `thumbnail_desktop_id`, `thumbnail_mobile_id`, `instructor_id`, `guest_id`, `overview_link`, and `trailer_link`.

- [ ] **Step 2: Add `get_course_levels( $course_id )`.**

Read `_tcnexus_course_levels`, accept only arrays, merge each stored level with defaults, and when the meta is absent build Beginner from the existing post title/content, taxonomy, language, media, people, and link fields. Mark Beginner enabled when the legacy course contains any meaningful data.

- [ ] **Step 3: Add `sanitize_course_levels( $raw_levels )`.**

Accept only the three known keys. Sanitize titles/content, taxonomy slugs, language, IDs, and URLs. Normalize `enabled` to a boolean and discard unknown level keys. Return all three canonical keys so the builder and REST response always have stable structure.

- [ ] **Step 4: Add migration for existing lessons.**

When a course is first read or saved after the feature is installed, query its linked lessons and set `_tcnexus_course_level` to `beginner` only when the meta is missing. Do not overwrite an explicit level.

- [ ] **Step 5: Add a one-time migration marker.**

Use a versioned option such as `_tcnexus_course_levels_migrated_1` and run a bounded migration over `tc_course` posts. The migration must only add structured Beginner data and lesson-level metadata; it must not delete or alter published course IDs, URLs, or lesson content.

- [ ] **Step 6: Verify migration idempotence.**

Run the migration twice against the local WordPress data and confirm the second run changes nothing. Query both published courses and verify their existing values remain available under Beginner.

### Task 2: Replace the Course Level selector with level tabs in the builder

**Files:**
- Modify `wordpress-plugin/tcnexus-lms/includes/class-tcnexus-course-builder.php`
- Modify `wordpress-plugin/tcnexus-lms/assets/course-builder.js`
- Modify `wordpress-plugin/tcnexus-lms/assets/course-builder.css`

- [ ] **Step 1: Render a level tablist around the course form.**

Render Beginner, Intermediate, and Advanced buttons with `role="tab"`, stable `aria-controls`, and one active tab. Use a hidden `active_level` field only for client state; the selected level is not submitted as the course's only level.

- [ ] **Step 2: Render independent level panels.**

For each level, render its own Basics, Media, People, and Links fields using names such as `levels[beginner][title]`, `levels[beginner][content]`, and `levels[beginner][instructor_id]`. Replace the current Course Level select with a read-only `Course Level` label/value pair. Place that pair where Author currently appears, and render Author where Course Level currently appears.

- [ ] **Step 3: Render enabled state without introducing a selector.**

Use the tab's presence and saved data to determine whether a level is configured. If a level has no saved data, show its blank fields and keep it disabled until the user enters meaningful details or adds a lesson. The UI must not present the old level dropdown.

- [ ] **Step 4: Give each level its own lesson panel.**

Filter lessons by `_tcnexus_course_level`, defaulting missing metadata to Beginner. Render one lesson table per level with field names such as `levels[beginner][lessons][existing]` and `levels[beginner][lessons][new]`. Keep the existing lesson controls, media picker, tier selector, and save buttons visually unchanged.

- [ ] **Step 5: Update client-side tab behavior.**

Add one active-level controller that toggles `hidden`, `aria-selected`, and active classes. Scope add-lesson, remove-row, expand-row, and template index replacement to the active level's lesson list. Keep all three panels in the same form so one Save Course submission preserves untouched levels.

- [ ] **Step 6: Preserve unsaved-change protection.**

Any input, change, tab switch that changes data, lesson add/remove, or media selection must mark the form dirty. Navigating away or using browser Back must continue to use the existing custom warning popup.

- [ ] **Step 7: Style the tabs and level label.**

Use the existing backend variables and rounded-pill language. Active tab uses the existing mint primary color; inactive tabs use the cream/gray treatment. The level label is read-only and visually matches the current field labels.

### Task 3: Save level-specific course fields and lessons

**Files:**
- Modify `wordpress-plugin/tcnexus-lms/includes/class-tcnexus-course-builder.php`

- [ ] **Step 1: Replace single-level POST reads.**

Read `$_POST['levels']` as an array, sanitize it through `sanitize_course_levels()`, and save it as `_tcnexus_course_levels`. Keep the existing top-level legacy meta synchronized from Beginner so old consumers continue to work.

- [ ] **Step 2: Save each level's taxonomy and media independently.**

For every enabled or meaningfully populated level, save course type terms in a level-specific meta field, save language/media/person/link values in the level object, and keep the existing post thumbnail/title/content synchronized to Beginner only.

- [ ] **Step 3: Save existing lessons with their level.**

Iterate each level's `existing` rows, validate that the lesson belongs to the course, persist its current fields, update `_tcnexus_course_level` to the current canonical key, and preserve delete behavior.

- [ ] **Step 4: Create new lessons with their level.**

Iterate each level's `new` rows, skip untouched rows, create the lesson, set `_tcnexus_course_id`, set `_tcnexus_course_level`, and persist video, duration, tier, thumbnail, description, and order exactly as the current builder does.

- [ ] **Step 5: Keep lesson save/add-new redirects level-aware.**

When `Save Lesson & Add New` is submitted, append both `level=<slug>` and `add_row=1` to the redirect so the same level tab is active after reload and the next blank row is inserted in that level.

### Task 4: Extend the REST API without breaking current consumers

**Files:**
- Modify `wordpress-plugin/tcnexus-lms/includes/class-tcnexus-rest-api.php`

- [ ] **Step 1: Add level serialization helpers.**

Create a helper that reads the builder's canonical level data, resolves image URLs and people, and returns `enabled`, `slug`, `label`, `title`, `content`, `thumbnail`, `image`, `course_types`, `lesson_count`, `overview_link`, `trailer_link`, `instructor`, `guest`, and `lessons`.

- [ ] **Step 2: Add `levels` and `configured_levels` to course responses.**

Return levels in Beginner, Intermediate, Advanced order and omit or mark disabled levels consistently. `configured_levels` contains only enabled slugs for badge rendering.

- [ ] **Step 3: Preserve legacy fields.**

Keep current `title`, `content`, `thumbnail`, `image`, `course_types`, `overview_link`, `instructor`, `guest`, and `lessons` fields mapped to Beginner when available, otherwise the first configured level.

- [ ] **Step 4: Verify REST output.**

Query the course collection and single-course endpoints for an existing course with Beginner data. Confirm the legacy fields remain present and the new level keys/lesson arrays are present.

### Task 5: Add level badges to the existing Style-2 surfaces

**Files:**
- Modify `frontend/src/app/core/models.ts`
- Modify `frontend/src/app/features/animation-style-2/animation-style-2.html`
- Modify `frontend/src/app/features/animation-style-2/animation-style-2.ts`
- Modify `frontend/src/app/features/animation-style-2/animation-style-2.scss`

- [ ] **Step 1: Add TypeScript models.**

Define `CourseLevelSlug`, `CourseLevel`, and `CourseLevelVersion` types. Make `levels` and `configured_levels` optional initially so old API responses remain type-safe during rollout.

- [ ] **Step 2: Add the level badge list to cards.**

Render the existing course type badge, lesson-count badge, then one badge per configured level. Keep the established badge sizing, typography, spacing, and color system.

- [ ] **Step 3: Add the same badges to expanded cards.**

Use the course's configured levels and keep the existing expanded-card controls and animation unchanged.

- [ ] **Step 4: Add the same badges to the slide-in course modal.**

Render level badges using the same markup/style as the expanded card. Do not implement badge-click level switching in this phase; badges are display-only until the level selection interaction is approved.

- [ ] **Step 5: Verify legacy and new courses.**

Confirm an existing course shows Beginner only, a course with multiple configured levels shows all configured level badges, and courses with no new level data still render using the compatibility fallback.

### Task 6: Verification and release checks

**Files:**
- Modify `wordpress-plugin/tcnexus-lms/tcnexus-lms.php` for the asset version bump.

- [ ] **Step 1: Bump the plugin version.**

Update both the plugin header and `TCNEXUS_LMS_VERSION` so WordPress reloads the builder assets.

- [ ] **Step 2: Run static checks.**

Run:

```powershell
node --check wordpress-plugin/tcnexus-lms/assets/course-builder.js
git diff --check -- wordpress-plugin/tcnexus-lms frontend/src
```

PHP lint should be run inside the WordPress PHP container or deployment environment because PHP is not installed in the local workspace.

- [ ] **Step 3: Run the builder acceptance flow.**

1. Create a course and fill Beginner details and lessons.
2. Switch to Intermediate, add different details and lessons, then save.
3. Reload and confirm both tabs retain their own values.
4. Add Advanced and confirm all three remain independent.
5. Edit an existing published course and confirm its current data appears in Beginner.
6. Navigate away with unsaved changes and confirm the warning modal still appears.

- [ ] **Step 4: Run API/front-end acceptance flow.**

1. Confirm the course endpoint returns all configured levels.
2. Confirm the catalog card shows one card with only configured level badges.
3. Confirm the expanded card and slide-in modal show the same badges.
4. Confirm current course navigation and existing card animations are unchanged.
