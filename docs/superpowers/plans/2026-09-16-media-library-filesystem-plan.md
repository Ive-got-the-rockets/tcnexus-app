# Media Library File-System Organization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a WordPress admin Media Library that organizes media into Course/Show folders, People folders, and Unsorted without duplicating or deleting files.

**Architecture:** Store folder ownership as attachment metadata rather than moving files on disk. A dedicated PHP service will resolve folder keys and display names from current Course/Show/person records, assign media when a picker saves an attachment, and migrate existing attachments into the correct folder when the library is opened. A dedicated admin page will render the folder tree and selected-folder media grid using server-rendered markup and the existing admin theme/assets.

**Tech Stack:** WordPress PHP admin page, attachment post metadata, existing `TCNexus_Media` picker, vanilla JavaScript, existing course-builder CSS/admin theme.

---

### Task 1: Define ownership and folder-resolution service

**Files:**
- Create: `wordpress-plugin/tcnexus-lms/includes/class-tcnexus-media-library.php`
- Modify: `wordpress-plugin/tcnexus-lms/tcnexus-lms.php`
- Test: `wordpress-plugin/tcnexus-lms/tests/media-library-folders.test.js`

- [ ] **Step 1: Write the failing contract test**

Assert that the service defines the fixed folder keys (`unsorted`, `instructors`, `guests`, `characters`), resolves Course/Show folders from post IDs, exposes an attachment owner meta key, and provides an assignment method.

- [ ] **Step 2: Run the test to verify it fails**

Run: `node wordpress-plugin/tcnexus-lms/tests/media-library-folders.test.js`

Expected: FAIL because the service file does not exist.

- [ ] **Step 3: Implement the minimal service**

Create methods with these contracts:

```php
TCNexus_Media_Library::assign_attachment( $attachment_id, $owner_type, $owner_id = 0 );
TCNexus_Media_Library::folder_key( $owner_type, $owner_id = 0 );
TCNexus_Media_Library::folder_label( $folder_key );
TCNexus_Media_Library::attachment_folder_key( $attachment_id );
TCNexus_Media_Library::organize_existing_media();
```

Use `_tcnexus_media_folder_key` on attachments. Recognize `tc_course` and `tc_show` as title-based folders, `tc_instructor` as Instructors or Guests based on `_tcnexus_person_role`, and `tc_character` as Characters. Invalid or missing ownership resolves to Unsorted. Use sanitized post titles for keys while retaining the current post title for display.

- [ ] **Step 4: Load the service and rerun the test**

Add the `require_once` before runtime hooks in `tcnexus-lms.php`. Run the contract test and expect PASS.

- [ ] **Step 5: Commit**

```text
git add wordpress-plugin/tcnexus-lms/includes/class-tcnexus-media-library.php wordpress-plugin/tcnexus-lms/tcnexus-lms.php wordpress-plugin/tcnexus-lms/tests/media-library-folders.test.js
git commit -m "feat: add media library folder ownership service"
```

### Task 2: Assign media from existing picker and builder saves

**Files:**
- Modify: `wordpress-plugin/tcnexus-lms/includes/class-tcnexus-media.php`
- Modify: `wordpress-plugin/tcnexus-lms/includes/class-tcnexus-course-builder.php`
- Modify: `wordpress-plugin/tcnexus-lms/includes/class-tcnexus-instructor-builder.php`
- Modify: `wordpress-plugin/tcnexus-lms/includes/class-tcnexus-character-builder.php`
- Test: `wordpress-plugin/tcnexus-lms/tests/media-library-assignment.test.js`

- [ ] **Step 1: Write the failing assignment test**

Assert that picker selection can identify its owning Course/Show/person, builder saves assign every selected attachment to that owner, and unassigned uploads remain Unsorted.

- [ ] **Step 2: Run it and confirm the expected failure**

Run: `node wordpress-plugin/tcnexus-lms/tests/media-library-assignment.test.js`

Expected: FAIL because picker ownership data and save-time assignment do not exist.

- [ ] **Step 3: Add owner metadata to picker markup**

Extend `TCNexus_Media::render_picker()` with optional owner type and owner ID data attributes. Preserve existing call compatibility by making the new arguments optional.

- [ ] **Step 4: Assign selected attachments at save time**

Pass the current Course/Show/person owner into each picker. On successful builder saves, call `assign_attachment()` for every attachment ID belonging to the record, including course/show media, lesson/episode media, and person profile media. When an image is removed, do not delete it; move it to Unsorted unless it is still referenced by another recognized owner.

- [ ] **Step 5: Verify assignment behavior**

Run the assignment test and expect PASS. Confirm the existing crop cleanup still deletes only the replaced source attachment after a successful crop.

- [ ] **Step 6: Commit**

```text
git add wordpress-plugin/tcnexus-lms/includes/class-tcnexus-media.php wordpress-plugin/tcnexus-lms/includes/class-tcnexus-course-builder.php wordpress-plugin/tcnexus-lms/includes/class-tcnexus-instructor-builder.php wordpress-plugin/tcnexus-lms/includes/class-tcnexus-character-builder.php wordpress-plugin/tcnexus-lms/tests/media-library-assignment.test.js
git commit -m "feat: assign media to content folders"
```

### Task 3: Add the Media Library admin page

**Files:**
- Modify: `wordpress-plugin/tcnexus-lms/includes/class-tcnexus-admin-menu.php`
- Modify: `wordpress-plugin/tcnexus-lms/includes/class-tcnexus-media-library.php`
- Create: `wordpress-plugin/tcnexus-lms/assets/media-library.css`
- Create: `wordpress-plugin/tcnexus-lms/assets/media-library.js`
- Test: `wordpress-plugin/tcnexus-lms/tests/media-library-page.test.js`

- [ ] **Step 1: Write the failing page contract test**

Assert that the page registers a Media Library screen, renders the folder labels, selected-folder breadcrumbs, search input, Upload Media action, grid/list controls, sort control, and media item type labels.

- [ ] **Step 2: Run it and confirm failure**

Run: `node wordpress-plugin/tcnexus-lms/tests/media-library-page.test.js`

Expected: FAIL because no Media Library screen or assets exist.

- [ ] **Step 3: Implement the server-rendered page**

Register the page under the Courses menu. Render the fixed folders first, then Course/Show folders grouped under Courses & Shows, with People folders grouped under People. Selecting a folder uses a query parameter and filters attachments by `_tcnexus_media_folder_key`. Opening the page first calls `organize_existing_media()` to migrate recognized existing attachments without deleting files.

- [ ] **Step 4: Implement the visual layout**

Use the approved mockup structure: left folder tree, active folder highlight, breadcrumbs, item count, search, upload action, grid/list toggle, sort dropdown, thumbnail cards, filenames, and file-type badges. Match the existing TC Nexus admin theme.

- [ ] **Step 5: Wire search, folder selection, upload, and views**

Use query parameters for folder and search so the page remains refreshable and linkable. Reuse the existing WordPress media modal for Upload Media and refresh the selected folder after upload. The upload itself starts Unsorted until a later owner assignment is known.

- [ ] **Step 6: Run the page contract test and commit**

Run: `node wordpress-plugin/tcnexus-lms/tests/media-library-page.test.js`

Expected: PASS.

```text
git add wordpress-plugin/tcnexus-lms/includes/class-tcnexus-admin-menu.php wordpress-plugin/tcnexus-lms/includes/class-tcnexus-media-library.php wordpress-plugin/tcnexus-lms/assets/media-library.css wordpress-plugin/tcnexus-lms/assets/media-library.js wordpress-plugin/tcnexus-lms/tests/media-library-page.test.js
git commit -m "feat: add organized media library screen"
```

### Task 4: Cover renames, migration, and safety behavior

**Files:**
- Modify: `wordpress-plugin/tcnexus-lms/includes/class-tcnexus-media-library.php`
- Modify: `wordpress-plugin/tcnexus-lms/includes/class-tcnexus-media.php`
- Test: `wordpress-plugin/tcnexus-lms/tests/media-library-safety.test.js`

- [ ] **Step 1: Add regression tests**

Cover these behaviors: a renamed Course/Show keeps one logical folder because the folder is resolved from the post ID; unlinked attachments resolve to Unsorted; opening the library does not call deletion functions; a crop failure retains the original; and a successful crop deletes only the source attachment after replacement metadata exists.

- [ ] **Step 2: Run the safety test and confirm the new assertions fail where behavior is missing**

Run: `node wordpress-plugin/tcnexus-lms/tests/media-library-safety.test.js`

- [ ] **Step 3: Implement migration and safety guards**

Use owner post IDs in attachment metadata alongside the folder key where needed, recalculate display labels from current post titles, and keep organization read/write operations separate from crop deletion. Ensure invalid attachment IDs and inaccessible posts fall back to Unsorted.

- [ ] **Step 4: Run the full focused verification suite**

Run:

```text
node wordpress-plugin/tcnexus-lms/tests/media-library-folders.test.js
node wordpress-plugin/tcnexus-lms/tests/media-library-assignment.test.js
node wordpress-plugin/tcnexus-lms/tests/media-library-page.test.js
node wordpress-plugin/tcnexus-lms/tests/media-library-safety.test.js
node wordpress-plugin/tcnexus-lms/tests/media-crop-cleanup.test.js
git diff --check
```

Expected: all tests pass and `git diff --check` exits 0. Existing line-ending warnings are acceptable; formatting errors are not.

- [ ] **Step 5: Commit the safety and migration changes**

```text
git add wordpress-plugin/tcnexus-lms/includes/class-tcnexus-media-library.php wordpress-plugin/tcnexus-lms/includes/class-tcnexus-media.php wordpress-plugin/tcnexus-lms/tests/media-library-safety.test.js
git commit -m "test: protect media library organization and cropping"
```

## Self-review

- Folder taxonomy: covered by Tasks 1 and 3.
- Course/Show and People assignment: covered by Task 2.
- Unsorted behavior: covered by Tasks 1, 2, and 4.
- Safe title renaming: covered by Task 4.
- No deletion during organization: covered by Task 4.
- Approved visual layout: covered by Task 3.
- Crop cleanup remains separate and tested: covered by Tasks 2 and 4.
