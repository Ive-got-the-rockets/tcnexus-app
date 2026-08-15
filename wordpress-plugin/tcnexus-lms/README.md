# TC Nexus LMS

Headless WordPress plugin: courses/lessons, tier gating, and the REST API the Angular front-end (`dev.tcnexus.tv`) calls against `api.tcnexus.tv`.

## Install

Upload/copy the `tcnexus-lms` folder into `wp-content/plugins/` on `api.tcnexus.tv`, then activate it under Plugins.

## Admin

- **Courses** menu: add courses, manage "Add New Type Of Course" (course_type taxonomy: Trading Courses, Platform Courses, etc.), and the Episode List (all lessons across courses).
- Each Episode has a side meta box: parent Course, Vimeo Video ID, Access Tier (Free / Registered / Paid), and order within the course.
- **Membership** menu: view all users and set their tier (Registered / Paid).
- Free-view cap is stored in the `tcnexus_free_limit` option (defaults to 5) — change via `update_option('tcnexus_free_limit', 10)` for now; an admin settings field can be added later.

## REST API (namespace `tcnexus/v1`)

All requests from Angular should send:
- `X-Visitor-Id`: a UUID generated client-side on first load and persisted in `localStorage` (not a cookie — avoids third-party cookie blocking across the `dev.` / `api.` subdomains).
- `X-Tcnexus-Token`: once a user has registered, the token returned by `/register`, persisted in `localStorage` and sent on every request thereafter.

| Method | Route | Purpose |
|---|---|---|
| GET | `/courses` | List all courses with thumbnail, type(s), lesson count |
| GET | `/courses/{id}` | Course detail + its lessons (title, tier, thumbnail, locked flag) |
| GET | `/lessons/{id}` | Lesson detail (no video source — use `/access/check` to unlock playback) |
| POST | `/access/check` | Body `{ "lesson_id": 123 }`. Evaluates the visitor/user's tier against the lesson's tier, records the view, and returns `{ granted, reason, vimeo_id? }`. `reason` is one of `ok`, `requires_registration`, `requires_payment`. |
| POST | `/register` | Body `{ "email": "..." }`. Creates the WP account, emails login credentials, migrates the anonymous view history to the new account, and returns `{ success, token }`. |

## Gating logic implemented

- **Free** lessons: anonymous visitors are capped at `tcnexus_free_limit` distinct free lessons (tracked by visitor-id + IP, so clearing localStorage alone doesn't reset it as long as the IP matches). The lesson that trips the cap is still granted; the next one isn't.
- **Registered** lessons: unlocked once an account exists (any tier ≥ registered). `all_registered_seen` is returned once they've viewed every Registered-tagged lesson in the catalog, for the front-end to show the upsell-to-Paid message.
- **Paid** lessons: only granted to users with the `paid` tier. Thumbnails should show a lock overlay client-side when `locked: true`.

## Not yet built

- Stripe integration (checkout, webhooks to flip a user to `paid`)
- Vimeo playback wiring beyond storing the Vimeo video ID
- CORS origins are hardcoded in `class-tcnexus-cors.php` (`dev.tcnexus.tv`, `localhost:4200`) — update if the front-end domain changes
