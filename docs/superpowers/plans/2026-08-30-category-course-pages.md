# Category Course Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Trading Courses and Platform Courses pages that reuse the landing-page hero/card presentation while showing only the selected category.

**Architecture:** Extend `CourseCatalog` with a route-derived category mode. The home route keeps all rows; category routes filter the existing course data, select the first filtered course as the temporary featured hero, and render one filtered carousel. Header links navigate to the new routes, while Store remains inactive.

**Tech Stack:** Angular standalone components, Angular Router, TypeScript, SCSS.

---

### Task 1: Add route modes and category filtering

**Files:**
- Modify: `frontend/src/app/app.routes.ts`
- Modify: `frontend/src/app/features/catalog/course-catalog.ts`

- [ ] Add route data values `catalogMode: 'home' | 'trading' | 'platform'` for `/`, `/trading-courses`, and `/platform-courses`.
- [ ] Read the route data in `CourseCatalog` with `ActivatedRoute` and expose a computed mode.
- [ ] Filter courses using the existing `course_types.includes('Platform')` rule.
- [ ] Use the first filtered course as the temporary category featured course.
- [ ] Make the rendered rows equal to one category row on category routes and preserve the current all-row home behavior.

### Task 2: Reuse the landing template for category pages

**Files:**
- Modify: `frontend/src/app/features/catalog/course-catalog.html`
- Modify: `frontend/src/app/features/catalog/course-catalog.scss`

- [ ] Keep the existing hero and card markup shared by all catalog modes.
- [ ] Render the category row title from the filtered mode without changing card interactions.
- [ ] Preserve loading, empty, error, hover-preview, lessons-list, and transition behavior.
- [ ] Add only the category-page presentation adjustments needed if the single-row layout requires them.

### Task 3: Wire the header navigation

**Files:**
- Modify: `frontend/src/app/app.html`

- [ ] Convert Trading Courses and Platform Courses into router links to the new routes.
- [ ] Keep Store as visible, non-navigating text until its URL is supplied.
- [ ] Keep the wordmark link returning to `/`.

### Task 4: Build and verify locally

**Files:**
- Test: `frontend/src/app/app.routes.ts`
- Test: `frontend/src/app/features/catalog/course-catalog.ts`
- Test: `frontend/src/app/features/catalog/course-catalog.html`

- [ ] Run `npm run build` from `frontend` and require a successful Angular build.
- [ ] Confirm the local server serves `/trading-courses` and `/platform-courses`.
- [ ] Confirm home still renders All Courses, My List when applicable, Trading Courses, and Platform Courses.
- [ ] Confirm category pages select their own first category course for the hero and show one carousel.
