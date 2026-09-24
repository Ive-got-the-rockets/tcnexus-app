# Paid Membership Popup and Settings Design

## Goal

Add a configurable paid-membership pricing popup for locked paid lessons. Both anonymous and registered visitors see the same front-end popup when they select paid content. The popup uses the approved Grok Grid layout with three visible tiers: Starter, Trader, and Pro Desk.

## Front-end behavior

- Keep the existing floating popup behavior and close/overlay handling.
- Remove the Individual/Team toggle from the paid-membership popup for now.
- Show a Monthly/Annual toggle.
- Store one monthly price per tier and calculate the displayed annual monthly-equivalent price from the global Save percentage.
- Change only the price digits when billing changes; do not recreate or reposition the popup.
- Animate each digit independently from left to right with a 300ms stagger and eased start/end.
- When Annual is active, the Save percentage label uses the popup's active dark text color.
- Keep button radius at 4.8px and preserve the existing popup visual language.

## WordPress settings panel

Extend the existing Membership → Popup Details screen with a paid-membership pricing section laid out like the front-end popup.

Global popup fields:

- Main header
- Sub text
- Save percentage
- Currency display (initially USD; retained as a setting for future expansion)
- Close button label

Each of the three tier panels contains:

- Tier name
- Tier sub text
- Monthly price
- Button text
- Editable bullet list
- Add bullet point control
- Remove bullet point control

The three tiers are active and visible by default. The Individual/Team selector is not persisted or rendered. The existing registration, final-free, and paid-member copy/media settings remain available and independent.

## Data and API

Store the new configuration in a dedicated WordPress option, normalized with safe defaults and sanitized values. Expose the normalized pricing configuration through the existing REST settings response so the Angular client can consume the same source of truth. Preserve existing settings when the new option is absent.

The front end normalizes malformed or incomplete API data back to defaults. Annual values are derived in the client from monthly values and the configured percentage, rounded to the nearest whole currency unit for display.

## Validation and failure handling

- Clamp Save percentage to a sensible 0–100 range.
- Require non-negative monthly prices.
- Drop empty bullet points when saving or normalizing.
- Keep at least one usable bullet row in the editor when a tier has no valid bullets.
- If the pricing settings request fails, use the built-in defaults and keep the existing popup usable.
- Prevent duplicate submit actions while saving the WordPress panel.

## Testing

- WordPress save/load tests for defaults, sanitization, bullet add/remove data, and annual calculation inputs.
- Angular unit tests for normalization and annual price calculation.
- Front-end interaction test confirming the modal remains mounted while prices update and that the second digit begins 300ms after the first.
- Browser smoke test for anonymous and registered paid-lesson clicks, monthly/annual switching, and responsive tier layout.

## Scope boundary

This work configures and displays membership pricing only. Payment checkout, subscriptions, tier entitlements, and payment-provider integration remain future work.
