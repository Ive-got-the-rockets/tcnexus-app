# Homepage Trailer Popup Design

## Goal

Add a Trailer action immediately after the homepage hero’s Play/Start Watching control. Clicking it opens a centered trailer dialog that matches the existing TC Nexus visual language.

## Approved visual direction

- Reuse the existing dark surfaces, paper text, signal accent, type hierarchy, borders, and button treatment.
- Keep the Trailer action visually secondary: an outlined control placed directly after the existing Play control.
- Present the trailer in a centered modal with a dimmed backdrop, a 16:9 media area, title/copy, and a close control.
- Avoid introducing new fonts, palette colors, decorative gradients, or unrelated layout changes.

## Interaction

- The Trailer button is keyboard reachable and has an explicit accessible label.
- Opening the dialog locks page scroll and moves focus to the dialog close button.
- Clicking the backdrop, clicking the close button, or pressing Escape closes the dialog.
- The dialog is a visual player placeholder for now; the media source can be wired in later without changing the surrounding interaction.
- Existing course preview, overview, lessons, and navigation behavior remain unchanged.

## Implementation boundary

The homepage is `AnimationStyle2Page`. The feature will be implemented in its template, component state/handlers, and SCSS. No new service or route is needed.
