# Card Carousel Animation Settings Design

## Goal

Add an **Animations → Card Carousel Animation** WordPress admin panel that stores named animation presets and supplies the active preset’s open, switch, and close timings to the Angular course carousel.

## User experience

- The WordPress admin sidebar gains a top-level **Animations** menu with a **Card Carousel Animation** submenu.
- The panel uses the existing TC Nexus backend visual language: cream background, Fraunces headings, Plus Jakarta Sans labels, green accent, existing field styling, button styling, spacing, and radii.
- The panel shows the active preset, three timing controls, a small preview, and save actions.
- The initial preset is named **Preset 01** and preserves the currently approved timings:
  - Open: `0.50s`
  - Switch: `0.28s`
  - Close: `0.35s`
- Admin can change the three timings and save them to the active preset.
- Admin can save the current timings as a new preset with a custom name and select any saved preset as active.
- Presets are not deleted by this feature; saved settings remain available for later selection.
- The front end uses only the active preset. Existing reduced-motion behavior remains unchanged.

## Data model and persistence

WordPress stores one option containing:

```php
array(
  'active_preset' => 'preset-01',
  'presets' => array(
    array(
      'id' => 'preset-01',
      'name' => 'Preset 01',
      'open' => 0.50,
      'switch' => 0.28,
      'close' => 0.35,
    ),
  ),
)
```

All values are sanitized and clamped to a safe range of `0.10s` to `2.00s`, rounded to two decimal places. Missing or invalid stored data falls back to Preset 01. The REST registration-settings response exposes the active preset as `animations.card_carousel`.

## Front-end behavior

- `CourseCatalog` reads the active animation settings from the existing registration-settings stream.
- The `.preview` open animation duration is set from the active preset’s `open` value.
- The `.preview--switching` animation and its top/left transition use `switch`.
- The `.preview--closing` animation uses `close`.
- CSS custom properties are applied to the preview element so the animation names and easing curves remain in SCSS while durations are data-driven.
- If the endpoint is unavailable, the existing Preset 01 timings are used.

## Backend structure

- `TCNexus_Animations_Settings` owns the option, defaults, normalization, admin page, and save handlers.
- `TCNexus_Admin_Menu` registers the top-level Animations menu and submenu page callback.
- The plugin bootstrap loads the class and registers the required admin-post handlers.
- The existing admin stylesheet receives scoped animation-panel styles; no existing Course Creation or Membership styling is replaced.
- The existing REST API adds the active animation settings to the registration-settings response.

## Validation

- Angular tests cover fallback defaults and normalization of timing values.
- The front-end production build must complete successfully.
- JavaScript syntax and `git diff --check` must pass.
- PHP lint is attempted if PHP is available; if unavailable in the local environment, the changed PHP remains manually reviewed and the limitation is reported.

