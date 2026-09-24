# Layout Style 3 Design

## Goal

Create a dedicated `/layout-style-3` page that is an exact copy of the current Layout Style 2 experience, with one intentional visual difference: the featured/background artwork uses an 8:3 presentation ratio.

## Scope

- Add a new `LayoutStyle3Page` route at `/layout-style-3`.
- Preserve the current Layout Style 2 page and its root route unchanged.
- Reuse the existing data loading, course/show carousels, dialogs, navigation, transitions, controls, typography, colors, and responsive behavior.
- Change only the featured/background artwork layout so the artwork is presented in an 8:3 frame.
- Keep the existing background image fitting/cropping behavior within that frame.

## Implementation approach

Duplicate the current Layout Style 2 page component files into a Style 3 feature folder, then make only the minimum identifiers/storage keys/route references needed to keep the new page isolated. The Style 3 stylesheet will inherit the current visual rules and override the featured artwork container to use `aspect-ratio: 8 / 3` where appropriate. No existing Style 2 files will be modified except for route registration.

## Acceptance criteria

1. `/layout-style-3` renders the same content and interactions as the current homepage/Layout Style 2 page.
2. The current `/` and `/animation-style-2` routes continue to render the existing page unchanged.
3. The Style 3 featured artwork is 8:3 at desktop widths, with no distortion and the existing cover/focal-point behavior.
4. Mobile and tablet layouts remain usable and do not introduce horizontal overflow.
5. Existing tests/build pass, and a browser smoke check confirms the new route loads.

## Out of scope

- New copy, new controls, new animation behavior, new imagery, or a redesigned content hierarchy.
- Replacing the current homepage.
- Changing the actual source image files.
