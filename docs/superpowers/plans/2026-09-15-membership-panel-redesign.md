# Membership Panel Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the main WordPress Membership screen as a scoped TC Nexus backend app surface while preserving all existing membership actions.

**Architecture:** Keep the existing PHP page and handlers, change only the page markup and its scoped stylesheet, and broaden the admin enqueue condition to include the real Membership page hook. Summary counts are derived server-side from the already-loaded users.

**Tech Stack:** WordPress/PHP, scoped CSS, Node.js assertion-based plugin contract tests.

---

### Task 1: Add a failing membership screen contract

**Files:**
- Create: `wordpress-plugin/tcnexus-lms/tests/membership-panel-layout.test.js`

- [ ] **Step 1: Write the failing test**

Assert that the PHP screen contains the scoped wrapper, header, settings card, three summary values, styled table, and preserved form actions; assert the admin theme recognizes `tcnexus-membership`.

```js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const page = fs.readFileSync(path.join(root, 'includes', 'class-tcnexus-admin-menu.php'), 'utf8');
const theme = fs.readFileSync(path.join(root, 'includes', 'class-tcnexus-admin-theme.php'), 'utf8');
assert.match(page, /tcn-membership-wrap/);
assert.match(page, /tcn-membership-header/);
assert.match(page, /tcn-membership-settings/);
assert.match(page, /tcn-membership-stats/);
assert.match(page, /tcn-membership-table/);
assert.match(page, /tcnexus_set_free_limit/);
assert.match(page, /tcnexus_set_tier_/);
assert.match(theme, /tcnexus-membership/);
console.log('membership panel layout contract passes');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node wordpress-plugin/tcnexus-lms/tests/membership-panel-layout.test.js`

Expected: FAIL because the current page uses the default wrapper/table and the theme does not recognize the real page hook.

### Task 2: Implement the approved Membership layout

**Files:**
- Modify: `wordpress-plugin/tcnexus-lms/includes/class-tcnexus-admin-menu.php`
- Modify: `wordpress-plugin/tcnexus-lms/includes/class-tcnexus-admin-theme.php`

- [ ] **Step 1: Add server-side counts**

After loading `$users`, initialize `$registered_count = 0` and `$paid_count = 0`; while rendering each user, increment the matching count from `TCNexus_Membership::get_user_tier( $user->ID )`.

- [ ] **Step 2: Replace the default wrapper with the scoped app surface**

Use `<div class="wrap tcn-membership-wrap">`, a `.tcn-membership-header` with eyebrow/title/subtitle, a `.tcn-membership-settings` card containing a labeled number input and original `tcnexus_set_free_limit` form, a `.tcn-membership-stats` group showing `count( $users )`, `$registered_count`, and `$paid_count`, and a `.tcn-membership-table-card` containing the existing user table.

- [ ] **Step 3: Preserve tier update behavior while improving row markup**

Keep the original `tcnexus_set_tier` action, user ID, nonce, tier values, and redirect behavior. Add `tcn-membership-table__user`, `tcn-membership-table__email`, `tcn-membership-tier`, and `tcn-membership-table__actions` classes without changing submitted field names.

- [ ] **Step 4: Enqueue styles on the real page hook**

Extend `$is_membership_screen` so it is true when `$hook` contains `_page_tcnexus-membership` or `_page_tcnexus-visitor-tracking`.

### Task 3: Add backend-aligned scoped styles

**Files:**
- Modify: `wordpress-plugin/tcnexus-lms/assets/admin-membership.css`

- [ ] **Step 1: Add membership-specific app styles**

Style the header, settings card, stats cards, tier pills, form controls, and table using the existing `--tcn-*` variables already defined in the stylesheet. Keep rules scoped under `.tcn-membership-wrap` so popup/tracking/animation screens are not affected.

- [ ] **Step 2: Add responsive rules**

Stack header/settings below 900px, collapse stats below 700px, and preserve table readability with horizontal overflow below 900px.

### Task 4: Verify behavior and polish

**Files:**
- Test: `wordpress-plugin/tcnexus-lms/tests/membership-panel-layout.test.js`
- Test: all existing files in `wordpress-plugin/tcnexus-lms/tests/`

- [ ] **Step 1: Run the new contract test**

Run: `node wordpress-plugin/tcnexus-lms/tests/membership-panel-layout.test.js`

Expected: PASS.

- [ ] **Step 2: Run the full plugin test suite**

Run: `Get-ChildItem wordpress-plugin/tcnexus-lms/tests/*.test.js | ForEach-Object { node $_.FullName }`

Expected: every test prints its contract message and exits successfully.

- [ ] **Step 3: Inspect the final diff**

Run: `git diff --check; git diff -- wordpress-plugin/tcnexus-lms/includes/class-tcnexus-admin-menu.php wordpress-plugin/tcnexus-lms/includes/class-tcnexus-admin-theme.php wordpress-plugin/tcnexus-lms/assets/admin-membership.css wordpress-plugin/tcnexus-lms/tests/membership-panel-layout.test.js`

Expected: no whitespace errors; only the membership screen, scoped stylesheet, enqueue condition, and contract test are changed.

