# Registration Popup Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add configurable registration popup copy/media in WordPress and implement the approved final-free-lesson popup flow in Angular.

**Architecture:** WordPress stores sanitized registration settings, exposes only public settings through a REST endpoint, and keeps access-limit enforcement unchanged. Angular loads settings once, preserves the access response, and coordinates modal states with lesson-player initialization so the final free lesson remains playable after either popup is closed.

**Tech Stack:** Angular 22, TypeScript, RxJS, Vitest/Angular TestBed, WordPress PHP REST API, native HTML5 image/video elements.

---

## File map

- Create `wordpress-plugin/tcnexus-lms/includes/class-tcnexus-registration-settings.php` for defaults, sanitization, admin rendering, saving, and public settings formatting.
- Modify `wordpress-plugin/tcnexus-lms/tcnexus-lms.php` to load the settings class and register its admin/REST hooks.
- Modify `wordpress-plugin/tcnexus-lms/includes/class-tcnexus-admin-menu.php` only if needed to add the Membership submenu link; keep existing membership and free-limit behavior intact.
- Modify `wordpress-plugin/tcnexus-lms/includes/class-tcnexus-rest-api.php` to expose `GET /registration-settings`.
- Modify `frontend/src/app/core/models.ts` with registration-settings and media types.
- Modify `frontend/src/app/core/access.service.ts` to cache the settings request and expose defaults on request failure.
- Modify `frontend/src/app/features/auth/register-modal.ts` and `.html` to render configured copy/media and expose explicit normal/final-warning modal states.
- Modify `frontend/src/app/features/auth/register-modal.scss` for constrained media and mobile-safe modal layout.
- Modify `frontend/src/app/features/lesson-player/lesson-player.ts` and `.html` to defer player initialization, open the first popup at the final free lesson, transition to the follow-up popup after a close, and show revised blocked copy.
- Modify `frontend/mock-api/server.js` to serve matching settings and threshold behavior for local end-to-end testing.
- Create focused Angular tests under `frontend/src/app/core/` and `frontend/src/app/features/auth/` for settings defaults and modal-flow decisions.

### Task 1: Define frontend settings and threshold behavior with failing tests

**Files:**
- Create: `frontend/src/app/core/registration-settings.ts`
- Create: `frontend/src/app/core/registration-settings.spec.ts`
- Modify: `frontend/src/app/core/models.ts`

- [ ] **Step 1: Write the failing unit tests**

Test the pure decision helpers with these cases:

```ts
it('identifies an anonymous response at the final free lesson', () => {
  expect(isFinalFreeLesson({ granted: true, reason: 'ok', tier: 'free', free_limit: 2, free_views_used: 2 }, false)).toBe(true);
});

it('does not identify registered viewers as final-free warnings', () => {
  expect(isFinalFreeLesson({ granted: true, reason: 'ok', tier: 'free', free_limit: 2, free_views_used: 2 }, true)).toBe(false);
});

it('does not warn when the access response has not reached the limit', () => {
  expect(isFinalFreeLesson({ granted: true, reason: 'ok', tier: 'free', free_limit: 2, free_views_used: 1 }, false)).toBe(false);
});
```

Define `RegistrationSettings`, `RegistrationCopy`, `RegistrationMedia`, and the `isFinalFreeLesson` signature in the test’s intended imports so the failure is caused by missing production behavior, not a typo.

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `npm test -- --include src/app/core/registration-settings.spec.ts` from `frontend`.

Expected: FAIL because the new helper/types do not exist yet.

- [ ] **Step 3: Add the minimal types and helper**

Add these shapes to `models.ts`:

```ts
export interface RegistrationCopy { heading: string; message: string; button_label: string; }
export interface RegistrationMedia { type: 'none' | 'image' | 'video'; url: string; alt: string; }
export interface RegistrationSettings { registration: RegistrationCopy; final_free: RegistrationCopy; media: RegistrationMedia; }
```

Implement `isFinalFreeLesson(access, registered)` as true only when `registered === false`, `access.granted === true`, `access.tier === 'free'`, and both counts are defined and equal with `free_views_used >= free_limit`.

- [ ] **Step 4: Run the focused test and confirm GREEN**

Run the same command. Expected: all focused tests pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/core/models.ts frontend/src/app/core/registration-settings.ts frontend/src/app/core/registration-settings.spec.ts
git commit -m "Add registration settings types and threshold helper"
```

### Task 2: Add WordPress registration settings storage and admin screen

**Files:**
- Create: `wordpress-plugin/tcnexus-lms/includes/class-tcnexus-registration-settings.php`
- Modify: `wordpress-plugin/tcnexus-lms/tcnexus-lms.php`

- [ ] **Step 1: Add admin-side implementation tests or static checks first**

Because this repository has no PHP test runner, create a focused verification checklist in the implementation PR/commit and use PHP syntax validation. The required checks are: defaults exist, `register_setting` or equivalent save path is nonce/capability protected, copy fields use `sanitize_text_field`/`sanitize_textarea_field`, media URL uses `esc_url_raw`, media type is allow-listed, and public output omits admin-only data.

- [ ] **Step 2: Implement defaults and option normalization**

Implement `TCNexus_Registration_Settings` with defaults:

```php
array(
  'registration' => array(
    'heading' => 'Register to continue watching.',
    'message' => 'Create a free profile with your email to keep watching. We’ll send your login details by email.',
    'button_label' => 'Create Profile',
  ),
  'final_free' => array(
    'heading' => 'This will be your last free lesson.',
    'message' => 'Register your email to keep watching free lessons.',
    'button_label' => 'Create Profile',
  ),
  'media' => array('type' => 'none', 'url' => '', 'alt' => ''),
)
```

Read the option merged with defaults. Sanitize and allow-list every field, permit only `none`, `image`, and `video`, and require a valid URL for rendered media.

- [ ] **Step 3: Add the Membership submenu and form**

Register a `Registration Settings` submenu beneath `tcnexus-membership`, restricted to `list_users`. Render the two copy sections and shared media fields. Save through `admin-post.php` with a dedicated action, `wp_nonce_field`, `current_user_can('list_users')`, sanitized values, and redirect back with `saved=1`.

- [ ] **Step 4: Wire the class into the plugin**

Require the class from `tcnexus-lms.php` and register its admin menu and save hooks. Ensure plugin activation is not required for existing installs to receive defaults; defaults are applied when the option is first read.

- [ ] **Step 5: Run PHP syntax verification**

Run `php -l` against the new class, modified plugin entrypoint, admin menu, and REST API files. Expected: no syntax errors.

- [ ] **Step 6: Commit**

```bash
git add wordpress-plugin/tcnexus-lms/includes/class-tcnexus-registration-settings.php wordpress-plugin/tcnexus-lms/tcnexus-lms.php
git commit -m "Add WordPress registration popup settings"
```

### Task 3: Expose public settings through the API and mock API

**Files:**
- Modify: `wordpress-plugin/tcnexus-lms/includes/class-tcnexus-rest-api.php`
- Modify: `frontend/mock-api/server.js`

- [ ] **Step 1: Add the response-shape test/check**

Verify the public response contains `registration`, `final_free`, and `media`, with only heading/message/button label/type/url/alt fields, and returns HTTP 200 without authentication.

- [ ] **Step 2: Add the WordPress route**

Register `GET /registration-settings` with `__return_true` and return `TCNexus_Registration_Settings::get_public_settings()`.

- [ ] **Step 3: Mirror defaults and the route in the mock API**

Add the same default object and respond to `GET /wp-json/tcnexus/v1/registration-settings` with JSON. Keep the mock free-limit setting configurable at its existing constant/test seam.

- [ ] **Step 4: Verify route behavior**

Run the mock API and request the endpoint. Expected: HTTP 200 and JSON matching the TypeScript interfaces. Run PHP syntax validation again for the REST file.

- [ ] **Step 5: Commit**

```bash
git add wordpress-plugin/tcnexus-lms/includes/class-tcnexus-rest-api.php frontend/mock-api/server.js
git commit -m "Expose registration popup settings API"
```

### Task 4: Load settings in Angular and render configurable modal media/copy

**Files:**
- Modify: `frontend/src/app/core/access.service.ts`
- Modify: `frontend/src/app/features/auth/register-modal.ts`
- Modify: `frontend/src/app/features/auth/register-modal.html`
- Modify: `frontend/src/app/features/auth/register-modal.scss`
- Create/modify: `frontend/src/app/features/auth/register-modal.spec.ts`

- [ ] **Step 1: Write failing modal rendering tests**

Cover: default/fetched registration heading, fetched button label, image above heading when media type is image, and video element with `autoplay`, `muted`, `loop`, and no `controls` attribute when media type is video.

- [ ] **Step 2: Run focused tests and confirm RED**

Run: `npm test -- --include src/app/features/auth/register-modal.spec.ts`.

Expected: FAIL because the modal does not yet load settings or render configured media.

- [ ] **Step 3: Add cached settings loading with defaults**

Add a `registrationSettings$` observable in `AccessService` using `shareReplay({ bufferSize: 1, refCount: true })`, mapping the API response through the same defaults/normalization helper and falling back to defaults on error. Expose the current settings to the modal via a signal or subscription consistent with the existing component style.

- [ ] **Step 4: Implement explicit modal flow state**

Add `register` and `final_free` popup modes alongside existing `login`, keep the email form behavior, and use the selected copy object for heading/message/button label. Keep success/error handling and duplicate-email behavior unchanged.

- [ ] **Step 5: Render media above the heading**

Render image media with `src` and sanitized `alt`; render video media with `autoplay`, `muted`, `loop`, `playsinline`, and no controls. Do not render a media element for `none` or invalid/empty URLs. Add responsive max-height/width styles so the modal remains usable on mobile.

- [ ] **Step 6: Run focused tests and confirm GREEN**

Run the same focused test command. Expected: all modal tests pass.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/core/access.service.ts frontend/src/app/features/auth/register-modal.ts frontend/src/app/features/auth/register-modal.html frontend/src/app/features/auth/register-modal.scss frontend/src/app/features/auth/register-modal.spec.ts
git commit -m "Render configurable registration popup content"
```

### Task 5: Implement final-free-lesson player flow with failing integration tests

**Files:**
- Modify: `frontend/src/app/features/lesson-player/lesson-player.ts`
- Modify: `frontend/src/app/features/lesson-player/lesson-player.html`
- Modify: `frontend/src/app/features/auth/register-modal.ts`
- Modify: `frontend/src/app/core/auth-modal.service.ts`
- Create/modify: `frontend/src/app/features/lesson-player/lesson-player.spec.ts`

- [ ] **Step 1: Write failing flow tests**

Cover these exact transitions:

```ts
it('opens the normal registration popup before starting the final free lesson', ...);
it('closing the normal popup opens the final-free popup without rechecking access', ...);
it('closing the final-free popup starts the deferred lesson', ...);
it('successful registration starts the deferred lesson after the modal closes', ...);
it('a later denied lesson keeps the registration-required state', ...);
```

Use a real small flow coordinator/helper where possible; mock only Angular HTTP and the player constructor boundary.

- [ ] **Step 2: Run focused tests and confirm RED**

Run: `npm test -- --include src/app/features/lesson-player/lesson-player.spec.ts`.

Expected: FAIL because access currently initializes the player immediately for granted responses and does not distinguish the two close transitions.

- [ ] **Step 3: Implement the deferred-start flow**

In `checkAccessAndProceed`, preserve the full access response. For a granted final-free anonymous response, store the course/lesson/restart context, open the normal registration modal, set a waiting status, and do not call `initPlayer`. When the first modal closes without registration, switch to `final_free`; when the second closes, call the existing player initialization once. When registration succeeds, close into the same deferred-start path. Ensure modal close effects cannot trigger duplicate access checks or duplicate player instances.

- [ ] **Step 4: Update denied-state wording**

Keep the existing blocked layout and button, but use concise wording such as “Register to continue watching” and “Create a free account to keep watching.” Preserve paid-lesson wording.

- [ ] **Step 5: Run focused tests and confirm GREEN**

Run the same focused test command. Expected: all flow tests pass.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/features/lesson-player/lesson-player.ts frontend/src/app/features/lesson-player/lesson-player.html frontend/src/app/features/auth/register-modal.ts frontend/src/app/core/auth-modal.service.ts frontend/src/app/features/lesson-player/lesson-player.spec.ts
git commit -m "Show registration prompts at the final free lesson"
```

### Task 6: Full verification and live deployment

**Files:**
- Modify only if verification reveals a defect in files from Tasks 1–5.

- [ ] **Step 1: Run all Angular tests**

Run: `npm test` from `frontend`. Expected: zero failed tests.

- [ ] **Step 2: Run the production build**

Run: `npm run build` from `frontend`. Expected: `Application bundle generation complete` with exit code 0.

- [ ] **Step 3: Run PHP syntax checks**

Run `php -l` for every modified PHP file. Expected: no syntax errors.

- [ ] **Step 4: Manually verify the approved threshold flow locally**

Set the backend/mock free limit to 2. In a private browser session verify: first free lesson plays; second opens the normal popup; closing it immediately opens the final-free popup; closing that starts the second lesson; registering from either popup starts the lesson and unlocks later free lessons; the third lesson shows the registration-required state.

- [ ] **Step 5: Inspect the final diff and status**

Run `git diff --check`, `git status --short`, and review changed files. Confirm no generated output, temporary Office files, or local-only assets are staged.

- [ ] **Step 6: Push and verify live endpoints**

Commit any final fixes, push `main`, then verify `https://dev.tcnexus.tv/`, `https://api.tcnexus.tv/wp-json/tcnexus/v1/courses`, and `https://api.tcnexus.tv/wp-json/tcnexus/v1/registration-settings` respond successfully. Perform the same private-window threshold test against the live site.
