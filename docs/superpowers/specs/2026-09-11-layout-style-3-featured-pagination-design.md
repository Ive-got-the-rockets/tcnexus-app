# Layout Style 3 Featured Pagination

## Goal

Add pagination navigation for the Layout Style 3 featured hero so each indicator represents one individual featured show or course. Selecting an indicator changes the featured hero content without affecting the existing carousel pagination below.

## Visual design

- Position the indicator stack inside the hero background image.
- Keep it 15px from the right edge of the window.
- Vertically center the stack against the hero background image.
- Render indicators as vertically stacked horizontal rectangles.
- Keep the active indicator in the middle of the visible stack.
- Make the active indicator 5px wide and more opaque.
- Make inactive indicators smaller and dimmer.
- Use the existing Layout Style 3 pagination visual language.
- Keep the control visually independent from the header and content rows.

## Behavior

- Each indicator represents one individual item from the available featured show/course collection.
- Clicking an indicator changes the featured item immediately.
- The hero background, title, description, metadata, people, actions, and trailer/course details update with the selected item.
- There is no autoplay.
- The active indicator remains centered in the stack when possible; the stack shifts only as needed near the beginning or end of the item list.

## Data flow

- Build the featured-item collection from the existing loaded shows and courses.
- Preserve the current featured-item fallback behavior when the page loads.
- Track the selected featured item with the existing signal-based component state.
- Reuse the existing featured-detail request flow when the selected item changes.
- Keep carousel page indicators and featured pagination state separate.

## Responsive behavior

- The control is scoped to Layout Style 3 only.
- Its right offset remains 15px from the viewport edge.
- Its vertical center is derived from the hero background container rather than the full page height.
- Indicator sizing and spacing can be tuned per breakpoint without changing other view sizes.
- Existing desktop, tablet, and smaller breakpoint hero positioning remains unchanged unless a later visual adjustment explicitly targets that breakpoint.

## Accessibility

- Each indicator is a button with an accessible label containing the featured item title.
- The active item exposes `aria-current="true"` or an equivalent selected state.
- Keyboard focus remains visible.
- Selecting an item does not require hover.

## Verification

- Confirm the indicator stack is 15px from the right edge and vertically centered over the hero image.
- Confirm each indicator selects the matching show/course.
- Confirm the active indicator is centered and visually distinct.
- Confirm hero content and background update together.
- Confirm existing carousel pagination and navigation arrows remain unchanged.
- Check the behavior at the currently active tablet view and at desktop HD.
