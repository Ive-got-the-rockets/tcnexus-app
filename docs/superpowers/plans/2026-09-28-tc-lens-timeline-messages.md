# TC Lens Timeline Messages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single lesson TC Lens message with a mixed, repeatable timeline of LLM and trade-data messages that dispatch once at their configured video start time.

**Architecture:** WordPress stores one sanitized JSON array in lesson post meta and exposes it as `tc_lens_timeline`. Both admin lesson editors render the same repeatable row model below guests. Angular receives normalized seconds and dispatches independent `postMessage` events to TC Lens as playback crosses each row's start time.

**Tech Stack:** WordPress/PHP admin and REST API, vanilla admin JavaScript/CSS, Angular/TypeScript, Plyr timeupdate events, Vitest.

---

## File map

- Modify `wordpress-plugin/tcnexus-lms/includes/class-tcnexus-course-builder.php`: timeline meta key, normalization helpers, course-builder rendering, and lesson save handling.
- Modify `wordpress-plugin/tcnexus-lms/includes/class-tcnexus-global-lessons.php`: global lesson timeline rendering and data attributes.
- Modify `wordpress-plugin/tcnexus-lms/assets/course-builder.js`: clone/new-lesson timeline row behavior if the existing lesson template requires client-side initialization.
- Modify `wordpress-plugin/tcnexus-lms/assets/course-builder.css`: timeline section and row layout below guests.
- Modify `wordpress-plugin/tcnexus-lms/assets/global-lessons.js`: serialize timeline rows in inline global-lesson saves.
- Modify `wordpress-plugin/tcnexus-lms/assets/global-lessons.css`: matching timeline section and row layout.
- Modify `wordpress-plugin/tcnexus-lms/includes/class-tcnexus-rest-api.php`: expose normalized `tc_lens_timeline` and stop exposing the legacy message as an active field.
- Modify `frontend/src/app/core/models.ts`: add the lesson timeline type and API field.
- Modify `frontend/src/app/features/lesson-player/tc-lens-message.ts`: add the timeline event payload builder.
- Create `frontend/src/app/features/lesson-player/tc-lens-timeline.ts`: pure due-event selection and dispatch-state helpers.
- Create `frontend/src/app/features/lesson-player/tc-lens-timeline.spec.ts`: unit tests for timing, overlap, duplicate prevention, and payload data.
- Modify `frontend/src/app/features/lesson-player/lesson-player.ts`: observe playback time, reset dispatch state per lesson/session, and post timeline events.
- Modify `frontend/src/app/core/courses.service.ts` and mock API fixtures if their lesson defaults require the new field.

### Task 1: Add the WordPress timeline data contract and sanitization

**Files:**
- Modify: `wordpress-plugin/tcnexus-lms/includes/class-tcnexus-course-builder.php`
- Test: `wordpress-plugin/tcnexus-lms/tests/course-lesson-labels.test.js` only if existing PHP/admin test conventions require an added fixture; do not alter unrelated assertions.

- [ ] **Step 1: Define the new meta key and normalized row shape.** Add `LESSON_TC_LENS_TIMELINE_META_KEY = '_tcnexus_tc_lens_timeline'` beside the current lesson meta constants. The normalized row keys must be `id`, `messageType`, `message`, `startTime`, and `endTime`.

- [ ] **Step 2: Add a sanitizer/normalizer for raw submitted rows.** Accept only `llm` and `trade`, trim the message, parse non-negative integer seconds, convert blank end times to `null`, reject empty messages and end times less than the start, and generate a stable row ID when one is missing.

- [ ] **Step 3: Add read/write helpers.** Decode the stored JSON array safely, normalize it for rendering/API output, and save it with `update_post_meta()` using `wp_json_encode()`.

- [ ] **Step 4: Update both new-lesson and existing-lesson save paths.** Read `timeline` from each lesson payload and write only the new timeline meta. Do not copy or convert `_tcnexus_tc_lens_message`.

- [ ] **Step 5: Run the existing plugin test command or PHP syntax checks.** Expected: no syntax errors and no unrelated test regressions.

- [ ] **Step 6: Commit the backend data-contract change.**

### Task 2: Replace the course-builder field with the mixed timeline editor

**Files:**
- Modify: `wordpress-plugin/tcnexus-lms/includes/class-tcnexus-course-builder.php`
- Modify: `wordpress-plugin/tcnexus-lms/assets/course-builder.js`
- Modify: `wordpress-plugin/tcnexus-lms/assets/course-builder.css`

- [ ] **Step 1: Remove the current single TC Lens textarea from existing and new lesson templates.** Keep the existing lesson description and guest controls unchanged.

- [ ] **Step 2: Render the timeline section after selected guests.** Use a container such as `.tcn-tc-lens-timeline` with a hidden/template row for new lessons and one visible row per stored event. Each row must have a type select, `Start time`, `End time`, message textarea, and remove button.

- [ ] **Step 3: Use names compatible with the existing nested course form.** Existing rows must submit under `levels[LEVEL][lessons][existing][ID][tc_lens_timeline][INDEX][...]`; new rows must use the equivalent `new` path so the current course save handler receives them with the lesson.

- [ ] **Step 4: Add client-side add/remove behavior.** Clone the new-row template, replace its index token, preserve row IDs for existing rows, and remove rows without leaving stale controls. A blank timeline must submit as an empty array.

- [ ] **Step 5: Add the visual layout below guests.** Match the current warm neutral admin styling, use compact pills for `LLM` and `Trade data`, and make rows stack cleanly below 1100px.

- [ ] **Step 6: Manually verify the course builder.** Add one LLM row, one Trade data row at the same start time, one ranged row, remove a row, save, reopen, and confirm all values persist.

- [ ] **Step 7: Commit the course-builder editor change.**

### Task 3: Replace the global-lessons editor and inline save payload

**Files:**
- Modify: `wordpress-plugin/tcnexus-lms/includes/class-tcnexus-global-lessons.php`
- Modify: `wordpress-plugin/tcnexus-lms/assets/global-lessons.js`
- Modify: `wordpress-plugin/tcnexus-lms/assets/global-lessons.css`

- [ ] **Step 1: Render the same mixed timeline row model below the global lesson’s guest section.** Use the normalized stored timeline to populate rows and use the same labels and time inputs as the course builder.

- [ ] **Step 2: Add global editor add/remove behavior.** New rows must receive unique client IDs, and remove must update the current DOM without affecting other lessons.

- [ ] **Step 3: Replace the old inline payload field.** Update the payload assembled around the existing `tc_lens_message` property so it sends `tc_lens_timeline: serializeTimelineRows(rowContainer)`.

- [ ] **Step 4: Serialize exact normalized values.** Convert `mm:ss` into integer seconds, set a blank end time to `null`, trim messages, and omit invalid/empty rows before the AJAX request.

- [ ] **Step 5: Manually verify global lessons.** Save an empty timeline, then save simultaneous LLM/trade rows and reload the page to confirm persistence.

- [ ] **Step 6: Commit the global-lessons editor change.**

### Task 4: Expose the normalized timeline through REST and frontend models

**Files:**
- Modify: `wordpress-plugin/tcnexus-lms/includes/class-tcnexus-rest-api.php`
- Modify: `frontend/src/app/core/models.ts`
- Modify: `frontend/src/app/core/courses.service.ts`
- Modify: `frontend/mock-api/server.js` if mock lesson responses are used by tests or local development.

- [ ] **Step 1: Return `tc_lens_timeline` from the lesson endpoint.** Use the course-builder read helper so API output always contains an array of normalized rows with integer seconds and `null` end times.

- [ ] **Step 2: Remove the legacy field from active frontend contract.** The new API response should not require `tc_lens_message`; existing API compatibility can be tolerated in the backend response only if current consumers need it, but the Angular model must use the new timeline field.

- [ ] **Step 3: Add TypeScript interfaces.** Define:

```ts
export type TcLensMessageType = 'llm' | 'trade';

export interface TcLensTimelineEvent {
  id: string;
  messageType: TcLensMessageType;
  message: string;
  startTime: number;
  endTime: number | null;
}
```

- [ ] **Step 4: Default missing mock/API timelines to `[]`.** This keeps older local fixtures usable without converting their legacy message values.

- [ ] **Step 5: Verify the API manually with lesson 35.** Expected response includes `tc_lens_timeline: []` until timeline rows are saved; the old lesson message must not populate it.

- [ ] **Step 6: Commit the API/model change.**

### Task 5: Add pure frontend timeline dispatch logic with tests first

**Files:**
- Create: `frontend/src/app/features/lesson-player/tc-lens-timeline.ts`
- Create: `frontend/src/app/features/lesson-player/tc-lens-timeline.spec.ts`
- Modify: `frontend/src/app/features/lesson-player/tc-lens-message.ts`

- [ ] **Step 1: Write failing tests for due-event selection.** Cover:

```ts
expect(getDueTimelineEvents(events, 119, 120, new Set())).toHaveLength(1);
expect(getDueTimelineEvents(events, 119, 120, new Set(['trade-1']))).toEqual([]);
expect(getDueTimelineEvents(events, 119, 121, new Set())).toHaveLength(2);
```

The second assertion proves a previously sent event is not duplicated; the third proves simultaneous LLM/trade rows are both returned.

- [ ] **Step 2: Write failing tests for range and seek semantics.** Confirm the returned event retains `startTime` and `endTime`, and that moving backward in time does not clear sent IDs automatically.

- [ ] **Step 3: Write failing payload tests.** The builder must return:

```ts
{
  type: 'tc-lens-timeline-event',
  videoId: '35',
  messageType: 'trade',
  message: 'Calculate the setup',
  startTime: 120,
  endTime: null,
  eventId: 'trade-1'
}
```

- [ ] **Step 4: Implement the pure helpers.** `getDueTimelineEvents(events, previousTime, currentTime, sentIds)` returns rows whose start is crossed by the interval and whose IDs are not in `sentIds`. `buildTcLensTimelineMessage(videoId, event)` builds the exact payload above.

- [ ] **Step 5: Run the focused Vitest file.** Expected: all timeline helper tests pass.

- [ ] **Step 6: Commit the tested timeline helpers.**

### Task 6: Connect playback time to TC Lens postMessage dispatch

**Files:**
- Modify: `frontend/src/app/features/lesson-player/lesson-player.ts`
- Modify: `frontend/src/app/features/lesson-player/tc-lens-message.ts`

- [ ] **Step 1: Add per-session dispatch state.** Track the previous playback time and a `Set<string>` of dispatched timeline row IDs. Clear both when the lesson changes or playback is explicitly restarted from the beginning.

- [ ] **Step 2: Use the existing Plyr `timeupdate` listener.** Preserve existing watch-progress behavior, then call the pure due-event helper with the previous and current seconds.

- [ ] **Step 3: Dispatch every due row independently.** For each due row, call `postMessage(buildTcLensTimelineMessage(String(lesson.id), event), XRAY_PANEL_ORIGIN)`. Do not stop after the first row, so simultaneous LLM/trade events both reach TC Lens.

- [ ] **Step 4: Handle iframe readiness.** If the TC Lens iframe is not ready, keep the timeline dispatch state unsent until the existing iframe load path is ready; do not mark a row sent before a successful `postMessage` call path.

- [ ] **Step 5: Preserve the current URL opening behavior.** The iframe/popup still opens at `https://app.tradecheetah.com?videoId=<lesson ID>`. The new timeline affects messages only.

- [ ] **Step 6: Run focused and existing player tests.** Expected: timeline tests pass and the existing TC Lens URL/message tests remain green.

- [ ] **Step 7: Commit the playback integration.**

### Task 7: End-to-end verification and handoff

**Files:**
- Modify only if verification exposes a concrete issue in the files above.

- [ ] **Step 1: Run frontend tests.**

Run:

```text
npm exec -- vitest run src/app/features/lesson-player/tc-lens-timeline.spec.ts src/app/features/lesson-player/tc-lens-message.spec.ts src/app/features/lesson-player/tc-lens-url.spec.ts
```

Expected: all focused files pass.

- [ ] **Step 2: Run the production build.**

Run:

```text
npm run build
```

Expected: build succeeds; record any pre-existing bundle budget warning separately from failures.

- [ ] **Step 3: Verify the WordPress API and admin manually.** Save lesson 35 with an LLM event at `00:30`, a Trade data event at `00:30`, and a ranged LLM event from `01:00` to `02:00`. Confirm the API returns all three normalized rows.

- [ ] **Step 4: Verify browser dispatch.** Open lesson 35, inspect the iframe message listener/log, advance playback across `00:30`, and confirm both same-time events arrive once. Seek backward without restarting and confirm they do not duplicate.

- [ ] **Step 5: Review the final diff.** Confirm unrelated changes remain untouched and the old single-message field is not rendered in either editor.

- [ ] **Step 6: Commit verification-only fixes if needed and report the exact test/build results.**
