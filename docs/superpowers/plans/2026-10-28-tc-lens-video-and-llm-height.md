# TC Lens Video and LLM Height Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Load the Mastering the Greeks lesson 1 Vimeo test video in TC Lens Layout 01 and cap the LLM frame at 300px tall.

**Architecture:** Keep the existing four-region component and replace only the video placeholder with an accessible Vimeo iframe. Update the layout contract and scoped grid styles so the LLM row and region are exactly 300px rather than growing beyond 300px on desktop or narrow screens.

**Tech Stack:** Angular 22 templates, SCSS Grid, Vimeo iframe embed, Node contract tests.

---

### Task 1: Update the layout contract

**Files:**
- Modify: `frontend/tests/tc-lens-layout-01.test.js`

- [ ] **Step 1: Replace the video-placeholder and minimum-height expectations**

Add the Vimeo assertion to the semantic-region test:

```js
assert.match(template, /<iframe[\s\S]*?title="Mastering the Greeks lesson 1"[\s\S]*?src="https:\/\/player\.vimeo\.com\/video\/1068479580/);
```

Replace the LLM styling assertion with:

```js
assert.match(styles, /\.tc-lens-layout__llm\s*\{[\s\S]*?height:\s*300px;[\s\S]*?max-height:\s*300px/);
assert.match(styles, /grid-template-rows:\s*44px minmax\(260px, 1fr\) 300px/);
assert.match(styles, /@media \(max-width:\s*900px\)[\s\S]*?grid-template-rows:\s*44px auto 300px minmax\(600px, 75dvh\)/);
```

Remove the old `min-height: 300px` assertion.

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```powershell
cd frontend
node --test tests/tc-lens-layout-01.test.js
```

Expected: FAIL because the template has no Vimeo lesson iframe and the LLM styles still use `min-height: 300px` with a flexible grid row.

### Task 2: Embed the lesson video and cap the LLM frame

**Files:**
- Modify: `frontend/src/app/features/tc-lens-layout-01/tc-lens-layout-01.html`
- Modify: `frontend/src/app/features/tc-lens-layout-01/tc-lens-layout-01.scss`
- Test: `frontend/tests/tc-lens-layout-01.test.js`

- [ ] **Step 1: Replace the video placeholder with the Vimeo iframe**

Replace the contents of the video section with:

```html
<iframe
  title="Mastering the Greeks lesson 1"
  src="https://player.vimeo.com/video/1068479580?dnt=1&playsinline=1&title=0&byline=0&portrait=0"
  allow="autoplay; fullscreen; picture-in-picture"
  allowfullscreen
></iframe>
```

- [ ] **Step 2: Make the LLM row and region 300px tall**

Change the desktop grid rows to:

```scss
grid-template-rows: 44px minmax(260px, 1fr) 300px;
```

Change the LLM rule to:

```scss
.tc-lens-layout__llm {
  grid-area: llm;
  height: 300px;
  max-height: 300px;
}
```

Change the narrow-screen rows to:

```scss
grid-template-rows: 44px auto 300px minmax(600px, 75dvh);
```

- [ ] **Step 3: Run the focused contract test**

Run:

```powershell
cd frontend
node --test tests/tc-lens-layout-01.test.js
```

Expected: 4 tests PASS, 0 tests FAIL.

- [ ] **Step 4: Run production verification**

Run:

```powershell
cd frontend
npm run build
npm run test:all
```

Expected: the production build exits with code 0; all TC Lens Layout 01 tests pass; the already documented unrelated `course-detail-actions.test.js` assertion may remain as the only full-suite failure.

- [ ] **Step 5: Verify in the browser**

Open `http://localhost:4200/tc-lens-layout-01` and verify:

- The Mastering the Greeks Vimeo lesson appears in the upper-left frame.
- The LLM frame measures 300px tall at desktop and below the 900px breakpoint.
- The right TC Lens app frame remains unchanged.
- No horizontal overflow or new console errors appear.

- [ ] **Step 6: Commit the focused update**

```powershell
git add frontend/tests/tc-lens-layout-01.test.js frontend/src/app/features/tc-lens-layout-01/tc-lens-layout-01.html frontend/src/app/features/tc-lens-layout-01/tc-lens-layout-01.scss docs/superpowers/plans/2026-10-28-tc-lens-video-and-llm-height.md
git commit -m "feat: load tc lens lesson video"
```
