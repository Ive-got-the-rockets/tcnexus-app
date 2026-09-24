# Shows Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a backend Shows builder that reuses the Course Builder UI and workflow, locks content to the Shows category, and supports multiple Characters.

**Architecture:** Extend the existing WordPress Course Builder with a shared content mode/configuration rather than duplicating its markup and assets. Add a distinct show content type or discriminator, character references, admin navigation, and matching mock/API serialization while leaving course behavior as the default.

**Tech Stack:** WordPress PHP plugin, wp-admin HTML/CSS/JS, Angular 22 mock/API consumer, Vitest/Karma-compatible tests.

---

### Task 1: Establish regression tests for Shows mode

**Files:**
- Create/Modify: `wordpress-plugin/tcnexus-lms/tests/` focused PHP tests for type/category/character persistence where the existing harness supports them.
- Create/Modify: `frontend/src/app/core/*.spec.ts` focused serialization/config tests if the frontend owns the shared model behavior.

- [ ] Write tests that fail until the system can represent a Show with category `shows` and multiple character IDs, while a Course still represents instructor/guest IDs.
- [ ] Run the repository’s available test commands and confirm the new assertions fail for the missing Shows behavior rather than because of a test setup error.

### Task 2: Add shared content-mode configuration

**Files:**
- Modify: `wordpress-plugin/tcnexus-lms/includes/class-tcnexus-course-builder.php`
- Modify: `wordpress-plugin/tcnexus-lms/tcnexus-lms.php`
- Modify: `wordpress-plugin/tcnexus-lms/includes/class-tcnexus-admin-theme.php`

- [ ] Introduce a builder mode resolved from the admin page slug, with Course as the default and Show as the new mode.
- [ ] Register the Shows admin menu item and route it into the same renderer, assets, nonce flow, and save lifecycle.
- [ ] Make labels, page URLs, post type/discriminator, and list queries mode-aware without changing Course defaults.

### Task 3: Persist Shows and enforce the Shows category

**Files:**
- Modify: `wordpress-plugin/tcnexus-lms/includes/class-tcnexus-post-types.php`
- Modify: `wordpress-plugin/tcnexus-lms/includes/class-tcnexus-course-builder.php`
- Modify: `wordpress-plugin/tcnexus-lms/includes/class-tcnexus-rest-api.php`

- [ ] Add the Show content registration or explicit show discriminator used by the builder and API.
- [ ] Save every Show to the existing Shows category, ignoring or rejecting submitted alternate categories server-side.
- [ ] Add multi-value character persistence and API formatting, retaining existing Course instructor/guest metadata compatibility.
- [ ] Ensure list, edit, delete, and reopen operations address Shows independently from Courses.

### Task 4: Replace people controls with multi-select Characters in Show mode

**Files:**
- Modify: `wordpress-plugin/tcnexus-lms/includes/class-tcnexus-course-builder.php`
- Modify: `wordpress-plugin/tcnexus-lms/includes/class-tcnexus-instructor-builder.php` or the shared profile query helper
- Modify: `wordpress-plugin/tcnexus-lms/assets/course-builder.js`
- Modify: `wordpress-plugin/tcnexus-lms/assets/course-builder.css`

- [ ] Render one Characters section in Show mode with reusable profile options and add/remove interaction for multiple selections.
- [ ] Keep Instructor and Guest controls only in Course mode.
- [ ] Sanitize character IDs, preserve ordering, tolerate deleted/missing profiles, and show the selected profiles after save/reopen.
- [ ] Update accessible labels, empty states, and quick-create behavior to use Characters in Show mode.

### Task 5: Mirror frontend/API models and mock data

**Files:**
- Modify: `frontend/src/app/core/models.ts`
- Modify: `frontend/mock-api/server.js`
- Modify: frontend route/catalog/detail files only if the existing frontend consumes Shows during this task.

- [ ] Add Show/Character fields to the shared model without removing Course fields.
- [ ] Make the mock API return Shows with the fixed category and multiple Characters so the builder/API contract can be exercised locally.
- [ ] Add or update tests for round-tripping multiple character references.

### Task 6: Verify and polish

**Files:**
- Modify only files identified by failing verification or focused UI issues.

- [ ] Run focused tests, the full frontend test suite, and `npm run build` from `frontend`.
- [ ] Run PHP syntax checks and the plugin test/lint commands available in the repository.
- [ ] Manually verify navbar, list, create/edit, fixed category, multiple Characters, save/reopen, lesson editing, media, publishing, and unchanged Course behavior.
- [ ] Review the diff to ensure unrelated existing worktree changes are not altered.

## Plan self-review

- Spec coverage: navigation and shared layout are covered by Tasks 2 and 4; fixed category and persistence by Task 3; multiple Characters by Task 4; compatibility by Tasks 2, 3, and 5; verification by Task 6.
- Placeholder scan: no unresolved TODO/TBD instructions are used.
- Type consistency: the plan consistently uses Show mode, Shows category, and multi-value character references; Course mode retains instructor/guest fields.
