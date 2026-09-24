# Homepage Trailer Popup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a homepage Trailer button after Play and a matching centered modal with accessible close behavior.

**Architecture:** Keep the feature local to `AnimationStyle2Page`, using signals for dialog state and the existing component modal patterns for animation, scroll locking, and Escape handling. Use a semantic dialog backdrop and a reusable existing visual token set; defer the actual trailer media source.

**Tech Stack:** Angular standalone component, Angular signals, SCSS, existing test/build scripts.

---

### Task 1: Add trailer state and lifecycle behavior

**Files:**
- Modify: `frontend/src/app/features/animation-style-2/animation-style-2.ts`

- [ ] **Step 1: Add the signal and timer state**

Add `trailerOpen`, `trailerClosing`, and `trailerCloseTimer` beside the existing modal signals.

- [ ] **Step 2: Add open and close handlers**

Add `openTrailer()` to clear a pending close, lock body scrolling, reset closing state, and open on the next animation frame. Add `closeTrailer()` to animate closed, then unlock scrolling and clear the state after the existing 650ms modal duration.

- [ ] **Step 3: Extend cleanup and Escape handling**

Clear `trailerCloseTimer` in `ngOnDestroy()`. Update `onEscape()` so the trailer closes before other page overlays when it is open.

### Task 2: Add the button and dialog markup

**Files:**
- Modify: `frontend/src/app/features/animation-style-2/animation-style-2.html`

- [ ] **Step 1: Add the Trailer button after Start Watching**

Place an outlined `style-featured__trailer` button immediately after `.style-featured__start`, with `(click)="openTrailer()"` and an `aria-label`.

- [ ] **Step 2: Add the dialog markup**

Render the backdrop when `trailerOpen()` or its closing state is active. Stop propagation inside a centered `section` with `role="dialog"`, `aria-modal="true"`, a close button, a 16:9 placeholder media region, title, and short copy.

### Task 3: Match the approved visual treatment

**Files:**
- Modify: `frontend/src/app/features/animation-style-2/animation-style-2.scss`

- [ ] **Step 1: Style the outlined Trailer button**

Reuse the existing `.style-featured__overview` border, color, radius, typography, and hover behavior while giving the button a stable dedicated class.

- [ ] **Step 2: Style the centered trailer modal**

Add fixed backdrop, opacity transitions, centered modal transform transitions, paper/signal borders, dark media placeholder, close control, and responsive sizing. Keep the treatment consistent with the existing course modal tokens.

### Task 4: Verify the feature

**Files:**
- Test: `frontend/src/app/app.spec.ts` and existing project test/build configuration

- [ ] **Step 1: Run the Angular build**

Run `npm run build` from `frontend` and confirm it completes without template or TypeScript errors.

- [ ] **Step 2: Run the existing test suite**

Run `npm test -- --watch=false` from `frontend` and confirm the existing tests pass.

- [ ] **Step 3: Manually verify interaction**

Open the homepage, confirm Trailer is immediately after Play, confirm the centered popup opens, and verify backdrop click, close button, Escape, and scroll locking.
