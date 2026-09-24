# TC-Lense Floating iframe Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Window-lift detach/dock control that turns the TC-Lense iframe into a draggable, resizable floating panel while restoring the player’s previous windowed/theater presentation.

**Architecture:** Keep the existing iframe and panel DOM inside Plyr. Add a detached signal and remembered geometry to `LessonPlayerPage`; docked mode continues using `placeXray()`, while detached mode applies fixed geometry to the existing panel and leaves the video in its captured pre-X-Ray layout. Use a small header for pointer dragging and CSS resize for dimensions, with `sessionStorage` persistence and viewport clamping.

**Tech Stack:** Angular 22 signals, TypeScript, Plyr, component SCSS, Vitest/Angular tests.

---

### Task 1: Add floating-panel state and geometry helpers

**Files:**
- Modify: `frontend/src/app/features/lesson-player/lesson-player.ts`

- [ ] Add typed geometry/state constants and signals: detached state, pre-X-Ray fullscreen/theater state, drag state, and session-storage key.
- [ ] Add helpers to read/write/clamp `{ left, top, width, height }`, defaulting to a viewport-safe 520x292 panel.
- [ ] Add `detachXray()` and `dockXray()` methods that toggle classes, restore the captured player layout, and call placement helpers.
- [ ] Keep the existing `setXrayOpen()` path unchanged for opening/closing the docked panel, but ensure it resets detached state when closing.

### Task 2: Add detach/dock controls and drag hooks

**Files:**
- Modify: `frontend/src/app/features/lesson-player/lesson-player.ts`

- [ ] Add the selected Window-lift SVG as the docked panel’s detach button and the matching reverse icon as the floating panel’s dock button.
- [ ] Add a panel header/title and pointer listeners that drag only from the header, clamp the result to the viewport, and persist the final geometry.
- [ ] Update the click exclusion in `addClickToggleOverlay()` so header, drag, detach, dock, and resize interactions never toggle video playback.

### Task 3: Style docked and floating panel states

**Files:**
- Modify: `frontend/src/styles.scss`

- [ ] Add header/control styles matching the existing TC-Lense controls and the selected Window-lift icon treatment.
- [ ] Add `.tcn-xray-panel--detached` fixed positioning, z-index, min/max dimensions, border, shadow, and `resize: both` behavior.
- [ ] Add detached-state rules so the panel no longer occupies the right-side dock and the video returns to its pre-X-Ray layout.
- [ ] Add reduced-motion-safe transitions and mobile viewport constraints.

### Task 4: Verify behavior

**Files:**
- Test: `frontend/tests/lesson-player-floating-iframe.test.js` (create if the existing lesson-player test harness has no suitable file)
- Verify: `frontend/src/app/features/lesson-player/lesson-player.ts`, `frontend/src/styles.scss`

- [ ] Test geometry defaults, viewport clamping, and session persistence.
- [ ] Test detach/dock state transitions and that closing TC-Lense clears detached state.
- [ ] Run the focused test command used by the frontend project, then run the production build.
- [ ] Manually verify: docked split layout, detach, drag, resize, dock, windowed mode, theater mode, viewport resize, and iframe interaction.

### Task 5: Review the final diff

- [ ] Confirm only lesson-player code/styles and the focused test/plan artifacts are part of this feature.
- [ ] Report the pre-existing dirty worktree and the git lock-file issue without altering unrelated changes.
