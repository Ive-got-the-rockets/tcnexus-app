# Course-Level and Show-Season Navigation

## Goal

Add consistent navigation between the available level variants of a course, or seasons of a show, on the existing detail page.

## Detail-page presentation

- Keep the existing course detail composition: title/art and description on the left, lesson/episode list on the right.
- Keep the new `Level` control beside the language control. Its menu lists only the other available levels; it omits the currently viewed level.
- Replace the `Lessons` / `Episodes` heading with the current level for a course or current season for a show. Make that heading a menu trigger with a right-pointing triangle; its menu offers the other available levels or seasons.
- Show the current course level as plain text above the description, at the lower-right edge of the title-art area, layered over the artwork. Use white Inter at weight 700 (no colored pill or badge). The show page uses its season label in the episode-list heading; no extra season tag is added to the artwork.

## Behavior

- Both selectors navigate to the matching course-level or show-season detail view using the app's existing route/data model; selecting a different entry updates the page content and active labels.
- Menu contents come from available configured levels/seasons, not a hard-coded list. The active option is excluded from both menus.
- Language selection remains unchanged and independent of level/season navigation.
- If there are no alternate levels/seasons, hide or disable the corresponding selector rather than showing an empty menu.

## Show Builder seasons

- In Show Builder, replace the fixed Beginner / Intermediate / Advanced tabs with dynamically stored season tabs. A show starts with `Season 1`; a compact `+` tab adds the next sequential season.
- Season tabs switch the editor between independent season metadata and episode assignments, following the existing language-tab save/reload pattern.
- Existing show content currently stored in the legacy Beginner slot is represented as `Season 1`; existing episodes remain attached to that season and keep their IDs and order. The legacy Intermediate and Advanced controls are not shown for shows and their data is not silently deleted by migration.
- Courses keep the fixed three-level model and existing builder behavior.
- Season selection is reflected in public show detail data and the episode list. The active season is selected with a `season` query parameter; absent or invalid values fall back to Season 1 (or the first available season if Season 1 is unavailable).

## Scope and verification

- Apply the behavior to the standard course/show detail page. Check the Style 3 featured detail view and align it only if it shares the same detail-navigation behavior.
- Add tests for available-option filtering, active-option exclusion, course versus show labels, the no-alternates case, dynamic season creation, Season 1 migration, and episode assignment preservation.
- Verify the existing detail-page layout at desktop and narrow viewport sizes and ensure the new controls remain usable without overlapping the artwork or lesson list.
