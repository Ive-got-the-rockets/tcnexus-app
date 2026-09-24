# Per-Episode Guest Assignments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an inline multi-guest selector to every backend video episode editor and persist each episode's guest assignments independently.

**Architecture:** Store guest IDs on each `tc_lesson` post under `_tcnexus_lesson_guest_ids`. Render the selector and selected guest list in both the Course/Show Builder Episodes card and the Global Episodes List editor, with the shared `persist_lesson_fields()` method handling sanitization and saving. Expose hydrated guest people in lesson REST responses, while retaining course-level guest data as a read-only fallback for legacy episodes.

**Tech Stack:** WordPress/PHP admin markup and post meta, vanilla JavaScript, existing builder CSS, Node contract tests.

---

### Task 1: Add failing backend contracts

**Files:**
- Create: `wordpress-plugin/tcnexus-lms/tests/episode-guests.test.js`

- [ ] **Step 1: Write the failing contract test**

Assert that the builder has a per-episode guest field and hidden guest ID inputs, that the shared persistence method references the new meta key, and that REST formatting exposes a `guests` field.

```js
const assert = require('node:assert/strict');
const fs = require('node:fs');

const builder = fs.readFileSync('wordpress-plugin/tcnexus-lms/includes/class-tcnexus-course-builder.php', 'utf8');
const rest = fs.readFileSync('wordpress-plugin/tcnexus-lms/includes/class-tcnexus-rest-api.php', 'utf8');

assert.match(builder, /Guests for this episode/);
assert.match(builder, /_tcnexus_lesson_guest_ids/);
assert.match(builder, /\[guests\]/);
assert.match(rest, /'guests'/);
console.log('episode guest contract passes');
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `node wordpress-plugin/tcnexus-lms/tests/episode-guests.test.js`

Expected: FAIL because the episode builder, persistence, and REST formatter do not yet contain the per-episode guest contract.

### Task 2: Add guest ID helpers and persistence

**Files:**
- Modify: `wordpress-plugin/tcnexus-lms/includes/class-tcnexus-course-builder.php` near the existing lesson persistence methods

- [ ] **Step 1: Add the dedicated meta-key constant**

Add `const LESSON_GUESTS_META_KEY = '_tcnexus_lesson_guest_ids';` beside the other lesson meta-key constants.

- [ ] **Step 2: Add a sanitizer for guest IDs**

Create a private helper that accepts an array, converts values with `absint`, removes duplicates, and keeps only posts with the guest role:

```php
private static function sanitize_lesson_guest_ids( $ids ) {
    $ids = array_values( array_unique( array_filter( array_map( 'absint', (array) $ids ) ) ) );
    return array_values( array_filter( $ids, function ( $id ) {
        return 'guest' === TCNexus_Post_Types::get_person_role( $id );
    } ) );
}
```

- [ ] **Step 3: Persist the array for existing lessons**

Inside `persist_lesson_fields()`, read `$data['guest_ids']`, sanitize it, and call `update_post_meta( $lesson_id, self::LESSON_GUESTS_META_KEY, $guest_ids );`. If the key is absent, preserve existing meta for compatibility; if it is present, an empty array clears the assignment.

- [ ] **Step 4: Persist the array for new lessons**

Inside the new-lesson creation branch, call the same sanitizer and `update_post_meta()` after creating the lesson. New episodes with no selection save an empty array.

- [ ] **Step 5: Add a helper for legacy fallback**

Add a helper that returns the explicit lesson guest IDs when the meta key exists, otherwise returns the current course-level `guest_id` as a one-item array. This lets old episodes continue displaying their existing guest without copying course data into every lesson.

### Task 3: Render the selector in both backend episode editors

**Files:**
- Modify: `wordpress-plugin/tcnexus-lms/includes/class-tcnexus-course-builder.php` in the existing lesson loop and new-lesson template
- Modify: `wordpress-plugin/tcnexus-lms/includes/class-tcnexus-global-lessons.php` in the expanded global lesson editor

- [ ] **Step 1: Load available guests and current IDs**

Use the existing `$guests` collection in the Course/Show Builder. For each lesson, load its explicit/fallback IDs using the helper. In the Global Episodes List, load all guest people once and use the lesson ID to load the current list.

- [ ] **Step 2: Add the episode field markup**

Render this structure inside each expanded episode editor:

```php
<div class="tcn-lesson-card__guests">
    <label class="tcn-field__label">Guests for this episode</label>
    <select class="tcn-select tcn-lesson-guest-picker">
        <option value="">Select a guest…</option>
        <!-- guest options -->
    </select>
    <div class="tcn-lesson-guest-list">
        <!-- selected guest rows with hidden guest_ids[] inputs and remove buttons -->
    </div>
    <p class="tcn-field__hint">Select guests from the dropdown. They will appear below.</p>
</div>
```

Each hidden input must use the episode's existing nested name, for example `levels[beginner][lessons][existing][123][guest_ids][]` or the equivalent `new` template path. Do not use one shared field name across episodes.

- [ ] **Step 3: Add the same field to the new-episode template**

Use the `__INDEX__` placeholder consistently so the existing row-template replacement logic creates a valid nested field name.

- [ ] **Step 4: Add global-lesson field names**

Use `guest_ids[]` in the global editor's row payload so `persist_lesson_fields()` receives the same array shape through AJAX.

### Task 4: Add client-side add/remove behavior

**Files:**
- Modify: `wordpress-plugin/tcnexus-lms/assets/course-builder.js`
- Modify: `wordpress-plugin/tcnexus-lms/assets/course-builder.css`

- [ ] **Step 1: Wire dropdown additions**

Use delegated change handling for `.tcn-lesson-guest-picker`. When a guest is selected, skip it if its ID already exists in the current `.tcn-lesson-guest-list`, append a guest row with the selected label and hidden input, reset the dropdown, and mark the builder dirty.

- [ ] **Step 2: Wire individual removal**

Use delegated click handling for `.tcn-lesson-guest-remove` to remove only its containing guest row and mark the builder dirty.

- [ ] **Step 3: Support dynamically added episodes**

Attach the listeners to the lessons list rather than individual rows so both existing and template-created episodes work without additional initialization.

- [ ] **Step 4: Style the inline list**

Add compact guest rows/chips in the existing admin visual language: avatar/name grouping, a clear remove control, wrapping on narrow screens, and an empty-state hint without adding a large nested panel.

### Task 5: Expose per-episode guests through REST

**Files:**
- Modify: `wordpress-plugin/tcnexus-lms/includes/class-tcnexus-rest-api.php`
- Modify: `frontend/src/app/core/models.ts` only if the frontend lesson model needs the new response field

- [ ] **Step 1: Hydrate guest people**

In `format_lesson()`, read explicit lesson IDs, apply the legacy course-level fallback only when the lesson meta key is absent, and map each valid person to the existing `{ id, name, photo }` shape.

- [ ] **Step 2: Add `guests` to the response**

Return `guests` as an array for every lesson, including `[]` when no guest is assigned. Preserve the existing lesson fields and minimal/full response behavior.

- [ ] **Step 3: Add the frontend type if needed**

Add `guests?: Person[]` to the lesson model used by the frontend, without changing current rendering unless a later front-end task requests it.

### Task 6: Verify the complete change

**Files:**
- Test: `wordpress-plugin/tcnexus-lms/tests/episode-guests.test.js`
- Test: existing tests under `wordpress-plugin/tcnexus-lms/tests/`

- [ ] **Step 1: Run the new contract test**

Run: `node wordpress-plugin/tcnexus-lms/tests/episode-guests.test.js`

Expected: `episode guest contract passes`.

- [ ] **Step 2: Run all existing Node contract tests**

Run: `Get-ChildItem wordpress-plugin/tcnexus-lms/tests -Filter *.test.js | ForEach-Object { node $_.FullName }`

Expected: every test exits 0.

- [ ] **Step 3: Check JavaScript syntax**

Run: `node --check wordpress-plugin/tcnexus-lms/assets/course-builder.js`

Expected: exit 0 with no syntax errors.

- [ ] **Step 4: Perform a manual backend check**

Open a Show Builder episode and a Course Builder lesson, add two guests to one episode, save, reload, remove one guest, and verify the other episode is unchanged. Confirm a legacy episode with no explicit guest meta still displays its course-level guest.
