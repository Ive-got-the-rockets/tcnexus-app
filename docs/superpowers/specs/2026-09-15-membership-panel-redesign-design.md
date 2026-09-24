# Membership Panel Redesign Design

## Goal

Redesign the main WordPress Membership admin screen so it matches the existing TC Nexus backend visual language and makes the two core operations easy to scan: adjusting the anonymous free-lesson limit and changing a registered user’s tier.

## Scope

- Main `Membership` screen only: free-lesson limit and users/tier table.
- Preserve current WordPress forms, nonces, permission checks, save handlers, and redirects.
- No changes to paid-membership popup settings, checkout, subscriptions, or access-control rules.

## Visual direction

Use the existing Course Builder/admin system: warm cream surface, sunken cream controls, restrained borders, mint primary actions, Fraunces-style serif headings, Plus Jakarta Sans body copy, rounded cards, and low-elevation shadows.

The screen becomes a framed backend app surface with this hierarchy:

1. Header: `Membership` title, short operational subtitle, and a contextual `Add member` action placeholder only if an existing member-creation route is available. Do not invent a new route; omit the action otherwise.
2. Free lesson limit card: label, explanatory copy, number input, and save button in one horizontal settings row that stacks on small screens.
3. Summary cards: total users, registered users, and paid members, calculated from the existing `$users` collection and current tier values.
4. Users table: existing user login/email/tier/update behavior, with clearer row hierarchy, tier badges, compact tier selector, and update button.

## Implementation notes

- Update `class-tcnexus-admin-menu.php` markup to use the scoped `tcn-membership-wrap` structure and the new membership-specific classes.
- Add scoped styles to `admin-membership.css`; do not alter shared Course Builder rules.
- Ensure the admin stylesheet is enqueued for the main `tcnexus-membership` page. The current hook check only recognizes the visitor-tracking screen, so the main page does not receive the intended membership styling.
- Keep the existing `saved` notice and form actions intact.
- Use semantic headings, table headers, visible focus states, and labels tied to the free-limit input.
- Avoid adding client-side behavior unless required for layout or accessibility.

## Responsive behavior

- Header and settings card stack below 900px.
- Summary cards collapse to one column below 700px.
- Users table remains readable by allowing horizontal scrolling below 900px, preserving all existing columns and controls.

## Validation

- Run the existing plugin tests.
- Verify the rendered markup contains the scoped wrapper and summary counts.
- Verify the existing free-limit save and per-user tier update forms still submit to their original handlers.
- Review the page at desktop and narrow widths for alignment, focus states, and no leakage into other wp-admin screens.

