# Live Stream Work Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Live navigation, a homepage Live carousel with two dummy shows, a dedicated Live page, a live-only iframe player route, and ten selectable calendar-icon variants.

**Architecture:** Extend the existing Angular landing shell and `LayoutStyle3Page` with a `live` landing mode and a local live dataset. Add a focused `LivePlayerPage` for `/live/:id`, reusing the existing iframe/player styling where possible. Keep all changes local to `frontend/src` and preserve unrelated working-tree changes.

**Tech Stack:** Angular standalone components, TypeScript signals/computed state, Angular Router, SCSS, inline SVG, Vitest/Karma project tests.

---

### Task 1: Add route and header navigation

**Files:**
- Modify: `frontend/src/app/app.routes.ts`
- Modify: `frontend/src/app/app.html`
- Modify: `frontend/src/app/app.ts`
- Modify: `frontend/src/app/app.scss`
- Test: `frontend/src/app/app.spec.ts`

- [ ] **Step 1: Add route-level tests for Live navigation state**

Extend the existing app tests with assertions that `/live` maps to the landing component and `activeNav()` returns `'live'` for `/live` and `/live/:id`.

- [ ] **Step 2: Run the focused app tests and confirm the new assertions fail**

Run from `frontend`:

```powershell
npm test -- --watch=false --include="src/app/app.spec.ts"
```

Expected: the new Live route/active-nav assertions fail before implementation.

- [ ] **Step 3: Register `/live` and `/live/:id` routes**

Import the landing component already used for `/shows`, import the new LivePlayerPage, and add:

```ts
{ path: 'live', component: ResponsiveLandingPage, data: { landingMode: 'live' } },
{ path: 'live/:id', component: LivePlayerPage },
```

Place the parameter route before the wildcard route and keep the player route chrome-enabled so the global header remains visible.

- [ ] **Step 4: Add Live to the header and active-nav union**

Add a router link labeled `Live` beside `Shows`, add the `'live'` return type, and match URLs beginning with `/live` in `activeNav()`.

- [ ] **Step 5: Add the calendar action slot immediately before Cart**

Add a button with `aria-label="Schedule"` before the existing Cart button. Keep it a no-op action until an icon is selected, and use the existing `site-header__icon` class so hit area and hover behavior remain consistent.

- [ ] **Step 6: Run focused tests and verify they pass**

Run the same focused test command. Expected: PASS.

- [ ] **Step 7: Commit the navigation slice**

```powershell
git add frontend/src/app/app.routes.ts frontend/src/app/app.html frontend/src/app/app.ts frontend/src/app/app.scss frontend/src/app/app.spec.ts
git commit -m "feat: add live navigation"
```

### Task 2: Create the local Live dataset and landing mode

**Files:**
- Create: `frontend/src/app/core/live-shows.ts`
- Modify: `frontend/src/app/features/responsive-layout/responsive-landing.ts`
- Modify: `frontend/src/app/features/layout-style-3/layout-style-3.ts`
- Modify: `frontend/src/app/features/layout-style-3/layout-style-3.html`
- Modify: `frontend/src/app/features/layout-style-3/layout-style-3.scss`
- Test: `frontend/src/app/features/layout-style-3/live-carousel.test.js`

- [ ] **Step 1: Define the two stable dummy live records**

Create a typed local array with exactly two records containing `id`, `title`, `shortTitle`, `status`, `scheduleLabel`, `description`, `thumbnailUrl`, and `embedUrl`. Use local or existing public artwork paths for thumbnails and a safe placeholder URL such as `about:blank` until real iframe URLs are supplied.

- [ ] **Step 2: Add a failing DOM-level carousel test**

Add a test fixture/helper that renders the landing page in `live` mode and asserts:

```js
expect(document.querySelectorAll('[data-live-card]').length).toBe(2);
expect(document.querySelector('[data-live-row]')).not.toBeNull();
```

Also assert that the Live row occurs before the Shows row in document order.

- [ ] **Step 3: Extend landing mode typing and filtering**

Add `'live'` to `LandingMode`, add `liveOnly`, load the local dataset without changing course/show API calls, and make featured content use the two live records when `/live` is active. Keep the existing course/show behavior unchanged for all other modes.

- [ ] **Step 4: Add the Live row above Shows on the homepage**

Add a dedicated Live carousel block before the existing Shows block. Each card must carry `data-live-card`, expose status/schedule metadata, and navigate to `/live/<id>` on click/keyboard activation. The row must carry `data-live-row` and reuse the current carousel arrow/page controls and row-scroll directive.

- [ ] **Step 5: Add responsive styling for Live cards and row spacing**

Reuse the current card variables and responsive breakpoints. Add only Live-specific signal/status styling, preserve the existing vertical rhythm, and ensure the new row adds height rather than overlaying Shows.

- [ ] **Step 6: Run the Live carousel test and verify it passes**

Run:

```powershell
npm test -- --watch=false --include="src/app/features/layout-style-3/live-carousel.test.js"
```

Expected: PASS with exactly two Live cards and Live before Shows.

- [ ] **Step 7: Commit the Live landing slice**

```powershell
git add frontend/src/app/core/live-shows.ts frontend/src/app/features/responsive-layout/responsive-landing.ts frontend/src/app/features/layout-style-3
git commit -m "feat: add live carousel"
```

### Task 3: Add the dedicated Live iframe player page

**Files:**
- Create: `frontend/src/app/features/live-player/live-player.ts`
- Create: `frontend/src/app/features/live-player/live-player.html`
- Create: `frontend/src/app/features/live-player/live-player.scss`
- Modify: `frontend/src/app/app.routes.ts`
- Test: `frontend/src/app/features/live-player/live-player.spec.ts`

- [ ] **Step 1: Write player-route and fallback tests**

Test that a valid dummy ID renders the title, Live status, iframe, schedule action, stream-info region, and next-up region. Test that an unknown ID renders a safe not-found state with a link back to `/live` and does not attempt an unsafe iframe URL.

- [ ] **Step 2: Run the player tests and confirm failure**

```powershell
npm test -- --watch=false --include="src/app/features/live-player/live-player.spec.ts"
```

Expected: FAIL because the component does not yet exist.

- [ ] **Step 3: Implement `LivePlayerPage` with safe URL handling**

Read the route `id`, find the matching local record, and bind only the record’s trusted placeholder `embedUrl` through `DomSanitizer`. Render the existing iframe player composition with Live-specific metadata and controls. Keep the iframe responsive and accessible with a descriptive title.

- [ ] **Step 4: Add Live-only control regions**

Render labeled regions for `Live now`, schedule/calendar, stream information, and `Next up`. Use non-destructive placeholder actions for schedule/info until the external provider contract is available.

- [ ] **Step 5: Add responsive player styling and reduced-motion behavior**

Match the existing dark paper/signal visual language, keep the iframe dominant, and collapse metadata into a readable mobile order. Respect `prefers-reduced-motion`.

- [ ] **Step 6: Run player tests and verify they pass**

Run the focused command again. Expected: PASS.

- [ ] **Step 7: Commit the player slice**

```powershell
git add frontend/src/app/features/live-player frontend/src/app/app.routes.ts
git commit -m "feat: add live iframe player"
```

### Task 4: Build the ten calendar-icon comparison and choose the final header icon

**Files:**
- Create: `frontend/src/app/shared/calendar-icons.ts`
- Modify: `frontend/src/app/app.html`
- Modify: `frontend/src/app/app.scss`
- Test: `frontend/src/app/app.spec.ts`

- [ ] **Step 1: Define ten accessible inline SVG icon variants**

Export a typed list of ten icon definitions, each with a stable key, label, and SVG path/markup. Keep the visual family consistent: thin line, currentColor, no external assets, and a 24×24 viewBox.

- [ ] **Step 2: Add a local comparison popover**

Make the Schedule button open a compact comparison panel showing all ten icons with labels and radio-style selection. Close on Escape and outside click, preserve keyboard focus, and keep the chosen key in a local signal. No persistence or backend setting is required for this work.

- [ ] **Step 3: Render the chosen icon in the header**

Replace the temporary icon with the selected definition and retain the same button dimensions, hover cue, and accessible label.

- [ ] **Step 4: Add tests for all ten options and selected rendering**

Assert that ten options render, each has a unique accessible label, and selecting an option changes the header icon without changing Cart/Profile order.

- [ ] **Step 5: Run app tests and verify they pass**

```powershell
npm test -- --watch=false --include="src/app/app.spec.ts"
```

Expected: PASS.

- [ ] **Step 6: Commit the icon slice**

```powershell
git add frontend/src/app/shared/calendar-icons.ts frontend/src/app/app.html frontend/src/app/app.scss frontend/src/app/app.spec.ts
git commit -m "feat: add calendar icon options"
```

### Task 5: Full local verification and handoff

**Files:**
- Verify: `frontend/package.json`
- Verify: all files changed in Tasks 1–4

- [ ] **Step 1: Run the full frontend test suite**

```powershell
npm test -- --watch=false
```

Expected: PASS with no regressions in existing course, show, carousel, or player tests.

- [ ] **Step 2: Run the production build**

```powershell
npm run build
```

Expected: successful Angular build with no template/type errors.

- [ ] **Step 3: Manually verify the local routes**

Start the existing local frontend workflow, then verify `/`, `/live`, `/live/<first-id>`, and `/shows` at desktop and mobile widths. Confirm Live is above Shows, the header icon sits left of Cart, both cards navigate, the iframe player renders, and unknown IDs show the safe fallback.

- [ ] **Step 4: Review the final diff without touching unrelated work**

```powershell
git status --short
git diff --stat HEAD~4..HEAD
```

Confirm only the intended Live Stream Work commits are included in the new commits; preserve all pre-existing user changes.

- [ ] **Step 5: Commit any verification-only fixes**

```powershell
git add frontend/src/app
git commit -m "test: verify live stream work"
```

Only create this final commit if verification required a source fix.

