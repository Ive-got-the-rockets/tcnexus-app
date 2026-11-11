# Live Stream Work — Design Specification

## Goal

Introduce Live as a first-class area of TC Nexus for future iframe-based broadcasts, while preserving the current visual language and existing course/show behavior.

## User experience

- The global header gains a `Live` link that routes to `/live`.
- A calendar icon is placed immediately to the left of the existing Cart icon. Ten visual variants will be shown during implementation; the selected variant becomes the final icon.
- The homepage gains a Live carousel above the existing Shows carousel. It contains two dummy live-show cards and uses the existing carousel navigation, spacing, responsive behavior, and card interactions.
- Existing Shows, Trading Courses, and Platform Courses rows remain available and shift down naturally after the new Live row.
- `/live` uses the existing landing-page shell and active-navigation behavior.
- Clicking either dummy live card routes to a dedicated live-player page. The page uses the existing iframe/player layout, with a Live-specific control surface reserved for stream status, schedule/calendar access, stream information, and a compact next-up area.
- Dummy cards use safe local placeholder data and placeholder iframe content until production embed URLs are supplied.

## Architecture

Extend the existing landing component with a `live` landing mode and a dedicated live collection/row, rather than duplicating the landing page. Add a separate live-player route/component for the live-only player experience. Reuse existing shared carousel/card styles and the existing iframe/X-ray player primitives where compatible.

The header route state expands to include `live`. Live data remains isolated from the course/show API so future live scheduling and iframe configuration can be introduced without changing course catalog behavior.

## Data and navigation

- Route: `/live`.
- Live player route: `/live/:id`.
- Dummy live records: two stable local records with title, thumbnail, status, schedule label, description, and iframe placeholder URL.
- Card activation: keyboard and pointer accessible; each card navigates to its live-player route.
- Back navigation: browser navigation returns to the Live page without mutating existing catalog state.

## Live-only player options

The initial UI should reserve space for:

1. Live status and viewer/schedule metadata.
2. Calendar/schedule action.
3. Stream information panel.
4. Next-up or related live-show strip.
5. Existing iframe controls and responsive behavior.

These are presentation placeholders only until the final iframe provider contract is supplied.

## Calendar icon options

Provide ten inline SVG options in a comparison view, all matching the existing thin-line neon header treatment:

1. Minimal outline calendar.
2. Filled-date square.
3. Rounded calendar.
4. Calendar-plus.
5. Calendar-check.
6. Split-flap date calendar.
7. Ring-bound calendar.
8. Tabbed calendar.
9. Compact calendar glyph.
10. Signal-dot calendar.

Each option must have an accessible label and preserve the header’s hit area and hover treatment.

## Responsive and accessibility requirements

- Live must work in the existing desktop and mobile shells.
- The header addition must not overflow the action group at narrow widths.
- Carousels retain current arrow, pagination, touch, and keyboard behavior.
- Live cards and controls require visible focus states, accessible labels, and reduced-motion compatibility.
- The iframe remains sandboxed/permissioned according to the existing player implementation; no production external URL is introduced by this work.

## Verification

- Route checks for `/live` and `/live/:id`.
- Header active-state and calendar placement checks.
- Live row ordering above Shows on desktop and mobile.
- Exactly two dummy Live cards render and navigate correctly.
- Existing Shows/courses/platform rows still render and retain navigation behavior.
- Live player placeholder loads with the dedicated options visible.
- Run the existing frontend test suite and build.
