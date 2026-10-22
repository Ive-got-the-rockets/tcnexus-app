# TC Lens trade editor implementation plan

**Goal:** Replace free-text trade legs with the approved underlying and option-row editor.

**Architecture:** Keep the current timeline and save workflow. Render structured PHP fields with a reusable option template, add delegated controls in a dedicated script, and use scoped course-builder styles. Store Stock/Crypto as `assetType`, shares as `quantity`, price and premiums as `entryPrice`, and each option in the existing `legs` array. Preserve legacy strategy, strikes and expiry fields on save. Native date inputs provide calendar selection.

**Tech stack:** WordPress PHP, vanilla JavaScript, CSS, jsdom, Angular models.

- [x] Add behavioral coverage for row creation/removal, unique field names, ticker context and side styling; confirm failure before implementation.
- [x] Render the approved fields and leg template, retain existing data, and sanitize asset type.
- [x] Implement add/remove, dirty-state notification, panel resizing and side/ticker updates.
- [x] Apply approved mint/red borders, centered red bins and the -2px plus glyph offset.
- [x] Run plugin contracts, PHP save/render checks, and frontend checks. Review the diff without changing unrelated work.

Validation: row behavior tests and PHP rendering/form round-trip checks pass, including deleting every option and reading legacy text legs. Frontend: 69 unit tests and 43 contracts pass; Angular build passes with an initial bundle-size warning. Plugin suite: 28 pass, 2 guest-label contracts fail (both also fail against HEAD). Live browser review is blocked by the local WordPress login screen; no credentials or existing lessons were changed.
