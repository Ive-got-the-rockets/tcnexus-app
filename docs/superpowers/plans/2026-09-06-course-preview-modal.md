# Course Preview Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 900px bottom-sheet course preview modal to Style 2, opened by the expanded card’s View Course button.

**Architecture:** Keep the feature inside the existing Style 2 page. Store the selected course detail in signals, load real course details through `CoursesService`, provide a small synthetic detail fallback for dummy platform cards, and render the modal as a fixed overlay with an animated sheet. Reuse the existing course/lesson model and URL helpers rather than changing backend APIs.

**Tech Stack:** Angular standalone component, signals, TypeScript, SCSS, existing `CourseDetail` and `Lesson` models.

---

### Task 1: Add modal state and actions

**Files:**
- Modify: `frontend/src/app/features/animation-style-2/animation-style-2.ts`

- [x] Add selected-course, open/closing, and close-timer signals.
- [x] Load real course details on View Course; create four placeholder lessons for negative dummy platform IDs.
- [x] Add open, close, escape, and lesson-navigation handlers while restoring body overflow on close and destroy.

### Task 2: Wire the expanded-card View Course buttons

**Files:**
- Modify: `frontend/src/app/features/animation-style-2/animation-style-2.html`

- [x] Change the list-icon View Course buttons in both carousels to open the preview modal.
- [x] Add the fixed backdrop, 900px sheet, course image, metadata badges, description, instructor/guest, and lessons markup.

### Task 3: Style and animate the modal

**Files:**
- Modify: `frontend/src/app/features/animation-style-2/animation-style-2.scss`

- [x] Add bottom-sheet slide-in/out motion, backdrop fade, hidden scrollbar, responsive sizing, matching badges, people rows, and lesson-row styling.
- [x] Keep the existing card and carousel styling unchanged outside the new modal selectors.

### Task 4: Verify

- [x] Run `git diff --check`.
- [x] Run `npm run build` from `frontend` and confirm the application bundle completes successfully.
- [ ] Manually verify open, close, Escape, backdrop close, real-course data, and dummy-card fallback behavior.
