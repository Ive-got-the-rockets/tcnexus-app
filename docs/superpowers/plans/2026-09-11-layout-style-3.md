# Layout Style 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add `/layout-style-3` as an isolated copy of the current Layout Style 2 page with an 8:3 featured artwork frame.

**Architecture:** Duplicate the existing standalone animation-style-2 feature so all current interactions and presentation remain intact. Register the duplicate route in `app.routes.ts`, and override only the featured background container sizing in the Style 3 stylesheet. Existing routes and Style 2 files remain unchanged.

**Tech Stack:** Angular 22 standalone components, TypeScript, SCSS, Vitest/browser build tooling.

---

### Task 1: Create the isolated Style 3 feature

**Files:**
- Create: `frontend/src/app/features/layout-style-3/layout-style-3.ts`
- Create: `frontend/src/app/features/layout-style-3/layout-style-3.html`
- Create: `frontend/src/app/features/layout-style-3/layout-style-3.scss`
- Create: `frontend/src/app/features/layout-style-3/trailer-embed-url.ts`
- Create: `frontend/src/app/features/layout-style-3/trailer-embed-url.spec.ts`

- [ ] Copy the three current Style 2 feature files into the new folder so the template and behavior are identical.
- [ ] Rename the component class to `LayoutStyle3Page`, selector to `app-layout-style-3`, template/style paths to the new filenames, and rename Style 2-specific storage/transition identifiers only where needed to isolate state.
- [ ] Copy the local trailer URL helper and its test so the duplicated page remains self-contained.
- [ ] Preserve all existing template bindings, dialogs, carousels, controls, and responsive rules.
- [ ] Add the Style 3 SCSS override for the featured background frame:

```scss
.style-featured__background {
  aspect-ratio: 8 / 3;
}
```

### Task 2: Register the dedicated route

**Files:**
- Modify: `frontend/src/app/app.routes.ts`

- [ ] Import `LayoutStyle3Page` from `./features/layout-style-3/layout-style-3`.
- [ ] Add `{ path: 'layout-style-3', component: LayoutStyle3Page }` without changing the root or `/animation-style-2` routes.

### Task 3: Verify behavior and visual sizing

**Files:**
- Test/build only; no additional source files.

- [ ] Run `npm run build` from `frontend` and confirm a successful production build.
- [ ] Start the local Angular frontend and open `/layout-style-3` in the browser.
- [ ] Confirm the page matches Style 2 content and controls, the page loads without console errors, and the featured artwork frame measures at an 8:3 ratio on desktop.
- [ ] Confirm `/` and `/animation-style-2` still load successfully.
- [ ] Run the existing frontend tests if the project test command is available.
