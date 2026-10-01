# TC Lens Host Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the TC Nexus frontend and WordPress plugin provide a complete, deterministic TC Lens host-side integration before Arun’s app receives the iframe messages.

**Architecture:** Keep TC Nexus responsible for lesson cue authoring, normalized REST data, session lifecycle, timestamp scheduling, idempotency, seeking, and the iframe layout. Send a versioned structured message protocol to Arun’s app through `postMessage`; keep simulator calculations, LLM calls, and chat rendering inside Arun’s app. Use pure TypeScript helpers for cue normalization and scheduling so the important behavior is testable without a browser.

**Tech Stack:** Angular 22, TypeScript, Vitest, Plyr/Vimeo, WordPress PHP admin fields and REST API, browser `postMessage`.

---

### Task 1: Define the structured cue and protocol types

**Files:**
- Modify: `frontend/src/app/core/models.ts`
- Modify: `frontend/src/app/features/lesson-player/tc-lens-message.ts`
- Test: `frontend/src/app/features/lesson-player/tc-lens-message.spec.ts`

- [x] **Step 1: Write failing tests for structured payloads**

Add tests that require a trade cue to carry structured trade fields, an LLM cue to carry question/context/learning level, and every outbound message to include protocol version, lesson ID, session ID, and event ID.

- [x] **Step 2: Run the focused test and confirm the expected failure**

Run from `frontend`:

```powershell
npm exec vitest run src/app/features/lesson-player/tc-lens-message.spec.ts
```

Expected: FAIL because the current event model only contains `message` and the current message builder has no session or version fields.

- [x] **Step 3: Add the minimal discriminated-union model**

Define `TcLensTradeData`, `TcLensLlmData`, `TcLensTimelineEvent`, and protocol message types. Keep `message` as an optional legacy fallback during migration, but make structured `data` the preferred field.

- [x] **Step 4: Implement message builders**

Build versioned messages for session start, session close, state sync, trade cue, LLM cue, seek, and acknowledgement. Every cue message must include `sessionId`, `lessonId`, `eventId`, and a monotonically increasing sequence number.

- [x] **Step 5: Run the focused test and confirm it passes**

Run the same Vitest command and expect all protocol tests to pass.

- [x] **Step 6: Commit the protocol types**

```powershell
git add frontend/src/app/core/models.ts frontend/src/app/features/lesson-player/tc-lens-message.ts frontend/src/app/features/lesson-player/tc-lens-message.spec.ts
git commit -m "feat: define structured TC Lens host protocol"
```

### Task 2: Add pure session and timeline scheduling rules

**Files:**
- Create: `frontend/src/app/features/lesson-player/tc-lens-session.ts`
- Test: `frontend/src/app/features/lesson-player/tc-lens-session.spec.ts`

- [x] **Step 1: Write failing tests for the brief’s timing rules**

Cover these behaviors with separate tests:

```ts
it('emits later cues once while the session is open');
it('does not replay missed LLM answers when a session opens late');
it('returns current active trade state for a late session open');
it('does not duplicate cues after a backward then forward seek');
it('stops emitting cues after session close');
it('resets all claimed cue IDs when the lesson changes');
```

- [x] **Step 2: Run the focused test and confirm it fails**

```powershell
npm exec vitest run src/app/features/lesson-player/tc-lens-session.spec.ts
```

Expected: FAIL because the session engine does not exist.

- [x] **Step 3: Implement the pure session engine**

Create a small state machine with `open`, `close`, `advance`, `seek`, and `resetLesson` operations. On late open, return a state-sync list of active trade cues but do not emit historical LLM answer cues. On forward playback, emit each unclaimed cue once. On close, clear pending emissions without deleting the lesson’s state until the session is explicitly reopened or the lesson changes.

- [x] **Step 4: Run the focused test and confirm it passes**

```powershell
npm exec vitest run src/app/features/lesson-player/tc-lens-session.spec.ts
```

Expected: PASS.

- [x] **Step 5: Commit the scheduler**

```powershell
git add frontend/src/app/features/lesson-player/tc-lens-session.ts frontend/src/app/features/lesson-player/tc-lens-session.spec.ts
git commit -m "feat: add TC Lens session timeline engine"
```

### Task 3: Upgrade WordPress cue authoring and REST normalization

**Files:**
- Modify: `wordpress-plugin/tcnexus-lms/includes/class-tcnexus-course-builder.php`
- Modify: `wordpress-plugin/tcnexus-lms/assets/course-builder.js`
- Modify: `wordpress-plugin/tcnexus-lms/assets/course-builder.css`
- Modify: `wordpress-plugin/tcnexus-lms/includes/class-tcnexus-rest-api.php`
- Test: `wordpress-plugin/tcnexus-lms/tests/course-lesson-labels.test.js`

- [x] **Step 1: Add failing PHP/fixture assertions for structured cue fields**

Extend the existing plugin test coverage or add a fixture assertion that a trade cue preserves underlying, strategy, legs, strikes, expiration, quantity, entry price, and assumptions, while an LLM cue preserves question, scene context, and learning level.

- [x] **Step 2: Run the plugin test and confirm it fails**

Run the repository’s existing WordPress test command documented by the plugin package. Expected: the new fields are missing from the normalized payload.

- [x] **Step 3: Add structured fields to the repeatable timeline row**

Render trade-specific fields and LLM-specific fields in the course builder, toggled by cue type. Keep start/end time, stable ID, and validation shared by both types.

- [x] **Step 4: Sanitize and normalize the new fields**

Update `sanitize_tc_lens_timeline()` to return a stable schema with empty defaults rather than dropping valid structured values. Validate numeric quantity/prices and preserve arrays for legs/strikes.

- [x] **Step 5: Expose the normalized fields through REST**

Ensure lesson responses return the structured `tc_lens_timeline` data unchanged after sanitization.

- [x] **Step 6: Run the plugin tests and confirm they pass**

Run the focused plugin test suite and expect PASS.

- [x] **Step 7: Commit the authoring/API work**

```powershell
git add wordpress-plugin/tcnexus-lms/includes/class-tcnexus-course-builder.php wordpress-plugin/tcnexus-lms/assets/course-builder.js wordpress-plugin/tcnexus-lms/assets/course-builder.css wordpress-plugin/tcnexus-lms/includes/class-tcnexus-rest-api.php wordpress-plugin/tcnexus-lms/tests/course-lesson-labels.test.js
git commit -m "feat: add structured TC Lens cue authoring"
```

### Task 4: Connect the session engine to the lesson player

**Files:**
- Modify: `frontend/src/app/features/lesson-player/lesson-player.ts`
- Modify: `frontend/src/app/features/lesson-player/lesson-player.spec.ts` or the existing lesson-player test harness
- Modify: `frontend/src/styles.scss` only if the LLM bottom surface needs host-side presentation changes

- [x] **Step 1: Write failing integration tests**

Test that opening TC Lens creates one session, sends a session-start message, sends a state sync for the current timestamp, sends later cue messages in order, sends a close message, and does not process cues while closed.

- [x] **Step 2: Run the focused integration test and confirm it fails**

```powershell
npm exec vitest run src/app/features/lesson-player
```

Expected: FAIL because the lesson player currently queues events even when TC Lens is closed and sends the old generic timeline message.

- [x] **Step 3: Replace the local queue logic with the session engine**

Generate a session ID when TC Lens opens, pass current time and cue data into the engine, and post the engine’s messages only while the iframe is active. Send close and reset events at the appropriate lifecycle boundaries.

- [x] **Step 4: Add iframe ready and acknowledgement handling**

Listen for messages from the configured TC Lens origin. Mark the frame ready only after a `tc-lens-ready` message or retain the existing load fallback. Track acknowledgements by event ID and do not resend acknowledged cues.

- [x] **Step 5: Verify the integration tests pass**

Run the focused tests again and expect PASS.

- [x] **Step 6: Commit the player integration**

```powershell
git add frontend/src/app/features/lesson-player/lesson-player.ts frontend/src/app/features/lesson-player
git commit -m "feat: connect TC Lens session lifecycle to player"
```

### Task 5: Add a local receiver fixture and handoff documentation

**Files:**
- Create: `frontend/tests/tc-lens-receiver-fixture.html`
- Create: `docs/tc-lens-host-integration.md`
- Modify: `frontend/tests/lesson-player-build-config.test.js`

- [x] **Step 1: Write a fixture test for the message contract**

Assert that the receiver fixture displays the last session ID, event sequence, trade data, LLM data, and acknowledgement status.

- [x] **Step 2: Build the minimal receiver fixture**

Create a browser-only fixture that listens for the documented messages, renders a diagnostic log, and sends `tc-lens-ready` and `tc-lens-ack` messages back to the parent.

- [x] **Step 3: Document Arun’s integration contract**

Document message shapes, origin validation, cue ordering, late-open behavior, seek behavior, close behavior, and the exact responsibilities remaining inside Arun’s app.

- [x] **Step 4: Run the focused frontend tests and build**

```powershell
npm exec vitest run
npm run build
```

Expected: focused TC Lens and static-contract tests pass; the production build completes with only bundle-budget warnings. The repository-wide Vitest command still includes pre-existing legacy suites that fail outside this work.

- [x] **Step 5: Commit the fixture and documentation**

```powershell
git add frontend/tests/tc-lens-receiver-fixture.html frontend/tests/lesson-player-build-config.test.js docs/tc-lens-host-integration.md
git commit -m "docs: provide TC Lens integration fixture and contract"
```

### Scope intentionally deferred to Arun’s app

- Trade simulator calculations and recalculation UI.
- LLM provider calls and answer generation.
- Chat history rendering and persistence inside the app.
- The final simulator/LLM visual state transitions after receiving a cue.
- Order placement; the host will continue to send learning data only.

### Self-review

- Structured trade and LLM fields are covered by Tasks 1 and 3.
- One-click session behavior, cue ordering, late opens, seeking, and close behavior are covered by Tasks 2 and 4.
- Responsive layout remains in the existing Layout 2 implementation and is not unnecessarily redesigned.
- Arun’s runtime responsibilities are explicitly kept out of host code.
- Every task has a failing-test step before production code.
