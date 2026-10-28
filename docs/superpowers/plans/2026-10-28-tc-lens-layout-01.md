# TC Lens Layout 01 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a separate local `/tc-lens-layout-01` Angular page with a thin account strip, upper-left video placeholder, lower-left LLM placeholder of at least 300px, and the existing TC Lens app in a tall right iframe.

**Architecture:** Create one standalone Angular page component whose template owns the four semantic regions and whose scoped stylesheet owns the desktop grid and narrow-screen stack. Register the component on its own chrome-free route, reuse the existing TC Lens URL helper, and leave `LessonPlayerPage` unchanged.

**Tech Stack:** Angular 22 standalone components, TypeScript 6, SCSS, Node test runner contract tests, existing TC Lens URL helper.

---

## File Structure

- Create `frontend/src/app/features/tc-lens-layout-01/tc-lens-layout-01.ts`: standalone page component and app iframe URL.
- Create `frontend/src/app/features/tc-lens-layout-01/tc-lens-layout-01.html`: four-region semantic page markup.
- Create `frontend/src/app/features/tc-lens-layout-01/tc-lens-layout-01.scss`: dark frame styling, desktop grid, 300px LLM minimum, and narrow stacked layout.
- Create `frontend/tests/tc-lens-layout-01.test.js`: route, markup, iframe, minimum-height, responsive-order, and lesson-route regression contracts.
- Modify `frontend/src/app/app.routes.ts`: import and register the isolated route without changing the lesson route.

### Task 1: Lock the new page contract with failing tests

**Files:**
- Create: `frontend/tests/tc-lens-layout-01.test.js`

- [ ] **Step 1: Write the failing contract tests**

```js
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const routes = readFileSync(new URL('../src/app/app.routes.ts', import.meta.url), 'utf8');
const templateUrl = new URL('../src/app/features/tc-lens-layout-01/tc-lens-layout-01.html', import.meta.url);
const stylesUrl = new URL('../src/app/features/tc-lens-layout-01/tc-lens-layout-01.scss', import.meta.url);
const componentUrl = new URL('../src/app/features/tc-lens-layout-01/tc-lens-layout-01.ts', import.meta.url);

test('registers TC Lens Layout 01 without changing the lesson-player route', () => {
  assert.match(routes, /path: 'tc-lens-layout-01', component: TcLensLayout01Page, data: \{ hideChrome: true \}/);
  assert.match(routes, /path: 'courses\/:id\/lessons\/:lessonId', component: LessonPlayerPage, data: \{ hideChrome: true \}/);
});

test('renders account, video, LLM, and app regions in semantic order', () => {
  const template = readFileSync(templateUrl, 'utf8');
  const regions = [...template.matchAll(/data-region="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(regions, ['account', 'video', 'llm', 'app']);
  assert.match(template, /<iframe[\s\S]*?title="TC Lens app"[\s\S]*?\[src\]="tcLensUrl"/);
});

test('reuses the existing TC Lens URL helper', () => {
  const component = readFileSync(componentUrl, 'utf8');
  assert.match(component, /import \{ buildTcLensUrl \} from '\.\.\/lesson-player\/tc-lens-url';/);
  assert.match(component, /buildTcLensUrl\('https:\/\/app\.tradecheetah\.com', 123\)/);
});

test('keeps the LLM frame at least 300px tall and stacks without overflow', () => {
  const styles = readFileSync(stylesUrl, 'utf8');
  assert.match(styles, /\.tc-lens-layout__llm\s*\{[\s\S]*?min-height:\s*300px/);
  assert.match(styles, /@media \(max-width:\s*900px\)[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\)/);
  assert.match(styles, /grid-template-areas:[\s\S]*?"account"[\s\S]*?"video"[\s\S]*?"llm"[\s\S]*?"app"/);
  assert.match(styles, /overflow-x:\s*hidden/);
});
```

- [ ] **Step 2: Run the focused test and verify the intended failure**

Run:

```powershell
cd frontend
node --test tests/tc-lens-layout-01.test.js
```

Expected: FAIL because the `tc-lens-layout-01` component files do not exist yet.

- [ ] **Step 3: Commit the red test**

```powershell
git add frontend/tests/tc-lens-layout-01.test.js
git commit -m "test: define tc lens layout 01 contract"
```

### Task 2: Build the isolated four-frame page

**Files:**
- Create: `frontend/src/app/features/tc-lens-layout-01/tc-lens-layout-01.ts`
- Create: `frontend/src/app/features/tc-lens-layout-01/tc-lens-layout-01.html`
- Create: `frontend/src/app/features/tc-lens-layout-01/tc-lens-layout-01.scss`
- Modify: `frontend/src/app/app.routes.ts`
- Test: `frontend/tests/tc-lens-layout-01.test.js`

- [ ] **Step 1: Add the standalone page component**

Create `frontend/src/app/features/tc-lens-layout-01/tc-lens-layout-01.ts`:

```ts
import { Component } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import { buildTcLensUrl } from '../lesson-player/tc-lens-url';

@Component({
  selector: 'app-tc-lens-layout-01',
  templateUrl: './tc-lens-layout-01.html',
  styleUrl: './tc-lens-layout-01.scss'
})
export class TcLensLayout01Page {
  protected readonly tcLensUrl: SafeResourceUrl;

  constructor(sanitizer: DomSanitizer) {
    this.tcLensUrl = sanitizer.bypassSecurityTrustResourceUrl(
      buildTcLensUrl('https://app.tradecheetah.com', 123)
    );
  }
}
```

- [ ] **Step 2: Add the four semantic regions**

Create `frontend/src/app/features/tc-lens-layout-01/tc-lens-layout-01.html`:

```html
<main class="tc-lens-layout" aria-label="TC Lens Layout 01">
  <header class="tc-lens-frame tc-lens-layout__account" data-region="account">
    <strong>TC Nexus</strong>
    <span>Local layout preview · account details</span>
  </header>

  <section class="tc-lens-frame tc-lens-layout__video" data-region="video" aria-labelledby="tc-lens-video-title">
    <div class="tc-lens-placeholder">
      <span>Video</span>
      <h1 id="tc-lens-video-title">Lesson video frame</h1>
    </div>
  </section>

  <section class="tc-lens-frame tc-lens-layout__llm" data-region="llm" aria-labelledby="tc-lens-llm-title">
    <div class="tc-lens-placeholder">
      <span>LLM</span>
      <h2 id="tc-lens-llm-title">Lesson assistant frame</h2>
    </div>
  </section>

  <section class="tc-lens-frame tc-lens-layout__app" data-region="app" aria-label="TC Lens app frame">
    <iframe title="TC Lens app" [src]="tcLensUrl" allow="clipboard-read; clipboard-write" referrerpolicy="strict-origin-when-cross-origin"></iframe>
  </section>
</main>
```

- [ ] **Step 3: Add the desktop grid and responsive stack**

Create `frontend/src/app/features/tc-lens-layout-01/tc-lens-layout-01.scss`:

```scss
:host {
  display: block;
  min-height: 100dvh;
  background: #080b10;
  color: #f5f7fb;
}

.tc-lens-layout {
  box-sizing: border-box;
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(360px, 1fr);
  grid-template-rows: 44px minmax(260px, 1fr) minmax(300px, 1.15fr);
  grid-template-areas:
    "account account"
    "video app"
    "llm app";
  gap: 10px;
  min-height: 100dvh;
  padding: 10px;
  overflow-x: hidden;
}

.tc-lens-frame {
  min-width: 0;
  overflow: hidden;
  border: 1px solid #2d3947;
  border-radius: 10px;
  background: #10161e;
}

.tc-lens-layout__account {
  grid-area: account;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 16px;
  font-size: 0.82rem;
  color: #aeb9c7;
}

.tc-lens-layout__account strong { color: #fff; }
.tc-lens-layout__video { grid-area: video; aspect-ratio: 16 / 9; }
.tc-lens-layout__llm { grid-area: llm; min-height: 300px; }
.tc-lens-layout__app { grid-area: app; min-height: 570px; }

.tc-lens-placeholder {
  display: grid;
  place-content: center;
  height: 100%;
  padding: 24px;
  text-align: center;
  background: radial-gradient(circle at center, #172432, #10161e 68%);
}

.tc-lens-placeholder span {
  color: #55dbe6;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.tc-lens-placeholder h1,
.tc-lens-placeholder h2 { margin: 8px 0 0; font-size: clamp(1.1rem, 2vw, 1.6rem); }

iframe { display: block; width: 100%; height: 100%; min-height: inherit; border: 0; background: #0b1016; }

@media (max-width: 900px) {
  .tc-lens-layout {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: 44px auto minmax(300px, auto) minmax(600px, 75dvh);
    grid-template-areas:
      "account"
      "video"
      "llm"
      "app";
  }

  .tc-lens-layout__app { min-height: 600px; }
}
```

- [ ] **Step 4: Register the new page route**

Add this import to `frontend/src/app/app.routes.ts` with the other feature imports:

```ts
import { TcLensLayout01Page } from './features/tc-lens-layout-01/tc-lens-layout-01';
```

Add this route immediately before the existing `courses/:id` routes:

```ts
{ path: 'tc-lens-layout-01', component: TcLensLayout01Page, data: { hideChrome: true } },
```

Do not edit the existing lesson-player route.

- [ ] **Step 5: Run the focused contract test and verify it passes**

Run:

```powershell
cd frontend
node --test tests/tc-lens-layout-01.test.js
```

Expected: 4 tests PASS, 0 tests FAIL.

- [ ] **Step 6: Run the complete frontend verification**

Run:

```powershell
cd frontend
npm run test:all
npm run build
```

Expected: unit and contract tests PASS; Angular production build exits with code 0.

- [ ] **Step 7: Verify the layout in a browser**

Run:

```powershell
cd frontend
npm start
```

Open `http://localhost:4200/tc-lens-layout-01` and verify:

- Desktop: 44px account strip spans the page, video is upper-left, LLM is lower-left and at least 300px tall, app spans the right column.
- At 900px and below: account, video, LLM, and app stack in that order.
- No horizontal scrollbar appears.
- The TC Lens iframe keeps its surrounding frame dimensions even if the remote app displays a sign-in or embedding restriction.
- The browser console has no new Angular or layout errors.

- [ ] **Step 8: Commit the implementation**

```powershell
git add frontend/src/app/app.routes.ts frontend/src/app/features/tc-lens-layout-01 frontend/tests/tc-lens-layout-01.test.js
git commit -m "feat: add tc lens layout 01 page"
```
