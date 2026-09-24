# Paid Membership Popup Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the configurable three-tier paid-membership popup end to end, with WordPress admin controls, REST delivery, automatic annual pricing, and the approved Grok Grid front-end behavior.

**Architecture:** WordPress owns and sanitizes a dedicated pricing option. The existing registration-settings REST endpoint returns both the existing registration popup settings and normalized pricing settings. Angular normalizes the response, renders the paid gate from one modal component, and updates only price digit elements when billing changes.

**Tech Stack:** WordPress/PHP admin and REST API, Angular 22, TypeScript, SCSS, RxJS, Vitest/Karma project tests.

---

### Task 1: Add pricing data contracts and defaults

**Files:**
- Modify: `wordpress-plugin/tcnexus-lms/includes/class-tcnexus-registration-settings.php`
- Modify: `frontend/src/app/core/models.ts`
- Modify: `frontend/src/app/core/registration-settings.ts`
- Test: `frontend/src/app/core/registration-settings.spec.ts`

- [ ] **Step 1: Add the typed pricing model and default values**

Add `MembershipTierSettings` with `name`, `description`, `monthly_price`, `button_label`, and `bullets`, and add `PaidMembershipSettings` with `heading`, `message`, `save_percent`, `currency`, `close_label`, and exactly three tier entries to `models.ts`. Add matching defaults: Starter $15, Trader $29, Pro Desk $79, with the three approved tier descriptions and bullets.

- [ ] **Step 2: Add normalization and annual-price calculation tests**

Extend `registration-settings.spec.ts` with tests that verify missing pricing data falls back to defaults, empty bullets are removed while one fallback bullet remains, save percentage is clamped to 0–100, negative prices become 0, and `annualPrice(15, 20)` returns 12 while `annualPrice(29, 20)` returns 23.

- [ ] **Step 3: Run the focused tests and confirm they fail for the new behavior**

Run `npm test -- --watch=false --include='src/app/core/registration-settings.spec.ts'` from `frontend`. Expected: the new pricing tests fail because the new types, defaults, and helpers are not implemented yet.

- [ ] **Step 4: Implement the normalized defaults and helpers**

Implement `DEFAULT_PAID_MEMBERSHIP_SETTINGS`, `normalizePaidMembershipSettings`, and `annualPrice` in `registration-settings.ts`. Export them for tests and use `Math.round(monthly * (1 - savePercent / 100))` for annual monthly-equivalent pricing.

- [ ] **Step 5: Run the focused tests again**

Run the same command. Expected: all registration-settings tests pass.

### Task 2: Persist and expose the settings in WordPress

**Files:**
- Modify: `wordpress-plugin/tcnexus-lms/includes/class-tcnexus-registration-settings.php`
- Modify: `wordpress-plugin/tcnexus-lms/includes/class-tcnexus-rest-api.php`
- Test: `wordpress-plugin/tcnexus-lms/README.md` or the existing PHP test location if one is present

- [ ] **Step 1: Define the dedicated WordPress option defaults**

Add `PAID_MEMBERSHIP_OPTION_NAME = 'tcnexus_paid_membership_settings'` and a `get_paid_membership_defaults()` method containing the same three tiers and global fields as the Angular defaults.

- [ ] **Step 2: Implement PHP normalization**

Add `get_paid_membership_settings()` and a private normalizer that sanitizes text fields, clamps `save_percent` to 0–100, converts monthly prices to non-negative integers, and removes empty bullet rows while retaining a fallback bullet when a tier has none. Do not mutate the existing registration/final-free/paid-member popup option.

- [ ] **Step 3: Add the Membership → Popup Details editor**

Extend `render_page()` with a new pricing form section using the existing Membership styling. Render the global fields and three independent tier panels. Each tier must include name, subtext, monthly price, button text, editable bullet rows, add/remove controls, and the existing nonce-protected save action. Include help text explaining that annual prices are calculated automatically.

- [ ] **Step 4: Add safe save handling**

Read `paid_membership` from the submitted form, normalize it, update only `PAID_MEMBERSHIP_OPTION_NAME`, and redirect back with a success flag. Preserve the existing popup save behavior and nonce.

- [ ] **Step 5: Include normalized pricing in the REST response**

Change `get_registration_settings()` to return the existing normalized popup settings plus a `paid_membership` object from the dedicated option. Keep the endpoint public and backward-compatible for clients that receive no pricing object.

- [ ] **Step 6: Run PHP syntax checks**

Run `php -l wordpress-plugin/tcnexus-lms/includes/class-tcnexus-registration-settings.php` and `php -l wordpress-plugin/tcnexus-lms/includes/class-tcnexus-rest-api.php`. Expected: no syntax errors.

### Task 3: Build the front-end paid membership popup

**Files:**
- Modify: `frontend/src/app/core/access.service.ts`
- Modify: `frontend/src/app/features/auth/register-modal.ts`
- Modify: `frontend/src/app/features/auth/register-modal.html`
- Modify: `frontend/src/app/features/auth/register-modal.scss`
- Modify: `frontend/src/app/features/course-detail/course-detail.ts`
- Modify: `frontend/src/app/features/course-detail/course-detail.html`
- Test: `frontend/src/app/core/registration-settings.spec.ts`

- [ ] **Step 1: Add the pricing settings stream to AccessService**

Normalize the `paid_membership` REST payload in the existing settings request and expose it as part of the `RegistrationSettings` signal without adding a second network request.

- [ ] **Step 2: Add a paid-member modal mode and trigger**

Extend the auth modal state with a paid-membership mode. When an anonymous or registered viewer selects a paid lesson, keep the current route/page intact and open this modal instead of navigating to the dead-end/course-error screen. Preserve the existing registration and final-free flows.

- [ ] **Step 3: Render the Grok Grid layout**

Render the configured heading and message, Monthly/Annual controls, and three tier cards. Hide the Individual/Team controls. Render each tier’s configured bullets and button. Keep the modal floating above the current page with the existing close button and overlay behavior.

- [ ] **Step 4: Implement annual toggle without remounting the modal**

Keep the modal DOM mounted. On billing change, update only each tier’s digit container, changing the first digit immediately and applying a 300ms delay to the second digit. Use eased start/end animation and align digits to the dollar-sign baseline. When Annual is active, calculate prices from monthly price and save percentage and render the Save label in the active dark text color.

- [ ] **Step 5: Wire the paid tier buttons**

Keep checkout behavior out of scope. The buttons should be ready for the future payment flow and use the configured labels, with a safe non-navigating action until payment integration is added.

- [ ] **Step 6: Add front-end tests**

Test that paid lesson selection opens the paid modal for anonymous and registered viewers, the Individual/Team selector is absent, the monthly/annual calculation uses the configured percentage, and the modal element remains the same element after switching billing.

### Task 4: Match the backend styling and add editor interactions

**Files:**
- Modify: `wordpress-plugin/tcnexus-lms/assets/admin-membership.css`
- Modify: `wordpress-plugin/tcnexus-lms/assets/admin-popup-details.js`
- Modify: `wordpress-plugin/tcnexus-lms/includes/class-tcnexus-registration-settings.php`

- [ ] **Step 1: Add course-creation-compatible styles**

Style the pricing editor with the existing course creation colors, typography, field heights, borders, 4.8px button radius, aligned labels, and the approved two-column preview/editor layout. Match the existing Save button’s normal and hover states.

- [ ] **Step 2: Add bullet row controls**

Use the existing admin popup script to add bullet rows, remove rows, and maintain correctly indexed names before submission. Ensure newly added rows use the same field height and spacing as existing rows.

- [ ] **Step 3: Add preview behavior**

Make the embedded admin preview update its copy, prices, annual percentage label, and tier fields as the admin edits them. The preview should show the annual Save label in black when Annual is selected and omit the Individual/Team switch.

- [ ] **Step 4: Verify admin assets are enqueued on Popup Details**

Confirm the script and stylesheet load only where needed and do not alter the existing course builder or visitor-tracking panels.

### Task 5: Verify, build, and prepare deployment files

**Files:**
- Modify: `frontend/src/app/core/registration-settings.spec.ts`
- Modify: `frontend/src/app/features/auth/register-modal.scss`
- Modify: `wordpress-plugin/tcnexus-lms/README.md`

- [ ] **Step 1: Run all front-end tests**

Run `npm test -- --watch=false` from `frontend`. Expected: all tests pass.

- [ ] **Step 2: Build the Angular front end**

Run `npm run build` from `frontend`. Expected: production build completes and outputs the deployable files under `frontend/dist/`.

- [ ] **Step 3: Run the local browser smoke test**

Verify anonymous and registered paid-lesson clicks, modal close behavior, Monthly/Annual switching, digit timing, configured tier copy, and the absence of the old course-error page. Verify the WordPress panel can save/reload all global and tier fields.

- [ ] **Step 4: Review the exact deployment set**

List the changed WordPress plugin PHP/assets files and the generated Angular `frontend/dist/` output needed for FTP/Vercel. Do not include unrelated workspace files.

- [ ] **Step 5: Commit the implementation**

Commit the focused implementation files with `git add` limited to the files above and `git commit -m "Add configurable paid membership pricing popup"`. If the workspace prevents index writes, report that clearly and leave the working tree changes intact.
