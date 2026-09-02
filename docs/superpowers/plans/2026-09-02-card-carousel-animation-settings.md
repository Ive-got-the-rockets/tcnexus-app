# Card Carousel Animation Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a WordPress-managed Card Carousel Animation panel with named presets and apply the active preset’s open, switch, and close durations to the Angular course-preview popup.

**Architecture:** A focused WordPress settings class will own defaults, normalization, persistence, and the admin page. The existing REST registration-settings response will expose only the active animation preset. Angular will normalize that optional payload, subscribe to it through the existing settings stream, and bind CSS custom properties to the existing preview element so the established animation names and easing curves remain unchanged.

**Tech Stack:** WordPress/PHP admin-post settings, WordPress REST API, Angular standalone components, TypeScript signals/observables, SCSS custom properties, Vitest.

---

### Task 1: Add failing normalization tests for animation presets

**Files:**
- Modify: `frontend/src/app/core/registration-settings.spec.ts`
- Test: `frontend/src/app/core/registration-settings.spec.ts`

- [ ] **Step 1: Write failing tests for defaults and clamping**

Add this import and test block to the existing pricing/settings test file:

```ts
import {
  annualPrice,
  DEFAULT_CARD_ANIMATION_SETTINGS,
  isFinalFreeLesson,
  isAnonymousFreeLimitReached,
  normalizeCardAnimationSettings,
  normalizePaidMembershipSettings,
  normalizeRegistrationSettings,
} from './registration-settings';

describe('card carousel animation settings', () => {
  it('provides Preset 01 defaults', () => {
    expect(normalizeCardAnimationSettings(undefined)).toEqual(DEFAULT_CARD_ANIMATION_SETTINGS);
  });

  it('clamps invalid durations to the supported range', () => {
    const settings = normalizeCardAnimationSettings({ open: 0, switch: 4, close: 'bad' } as never);

    expect(settings.open).toBe(0.1);
    expect(settings.switch).toBe(2);
    expect(settings.close).toBe(DEFAULT_CARD_ANIMATION_SETTINGS.close);
  });

  it('preserves a named active preset', () => {
    const settings = normalizeCardAnimationSettings({ id: 'custom-1', name: 'Gentle', open: 0.75, switch: 0.4, close: 0.55 });

    expect(settings).toEqual({ id: 'custom-1', name: 'Gentle', open: 0.75, switch: 0.4, close: 0.55 });
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run from `frontend`:

```powershell
npm test -- --watch=false src/app/core/registration-settings.spec.ts
```

Expected: FAIL because the animation exports do not exist yet.

### Task 2: Implement Angular animation settings normalization and model

**Files:**
- Modify: `frontend/src/app/core/models.ts`
- Modify: `frontend/src/app/core/registration-settings.ts`
- Test: `frontend/src/app/core/registration-settings.spec.ts`

- [ ] **Step 1: Add the model types**

Add these interfaces and the optional registration-settings property:

```ts
export interface CardAnimationSettings {
  id: string;
  name: string;
  open: number;
  switch: number;
  close: number;
}

export interface RegistrationSettings {
  registration: RegistrationCopy;
  final_free: RegistrationCopy;
  paid_member: RegistrationCopy;
  pricing: PaidMembershipSettings;
  animations?: {
    card_carousel: CardAnimationSettings;
  };
}
```

- [ ] **Step 2: Add Preset 01 and normalization**

In `registration-settings.ts`, add:

```ts
export const DEFAULT_CARD_ANIMATION_SETTINGS: CardAnimationSettings = {
  id: 'preset-01',
  name: 'Preset 01',
  open: 0.5,
  switch: 0.28,
  close: 0.35,
};

export function normalizeCardAnimationSettings(value: Partial<CardAnimationSettings> | undefined): CardAnimationSettings {
  const source = value ?? {};
  const duration = (input: unknown, fallback: number): number => {
    const parsed = Number(input);
    return Number.isFinite(parsed) && parsed >= 0.1 && parsed <= 2
      ? Math.round(parsed * 100) / 100
      : fallback;
  };

  return {
    id: String(source.id ?? DEFAULT_CARD_ANIMATION_SETTINGS.id).trim() || DEFAULT_CARD_ANIMATION_SETTINGS.id,
    name: String(source.name ?? DEFAULT_CARD_ANIMATION_SETTINGS.name).trim() || DEFAULT_CARD_ANIMATION_SETTINGS.name,
    open: duration(source.open, DEFAULT_CARD_ANIMATION_SETTINGS.open),
    switch: duration(source.switch, DEFAULT_CARD_ANIMATION_SETTINGS.switch),
    close: duration(source.close, DEFAULT_CARD_ANIMATION_SETTINGS.close),
  };
}
```

Merge the normalized optional `animations.card_carousel` into `normalizeRegistrationSettings`, falling back to Preset 01 when the REST field is absent.

- [ ] **Step 3: Run the focused test and verify it passes**

Run:

```powershell
npm test -- --watch=false src/app/core/registration-settings.spec.ts
```

Expected: all registration-settings tests pass.

### Task 3: Add WordPress animation settings storage and admin page

**Files:**
- Create: `wordpress-plugin/tcnexus-lms/includes/class-tcnexus-animations-settings.php`
- Modify: `wordpress-plugin/tcnexus-lms/tcnexus-lms.php`
- Modify: `wordpress-plugin/tcnexus-lms/includes/class-tcnexus-admin-menu.php`
- Modify: `wordpress-plugin/tcnexus-lms/assets/admin-membership.css`

- [ ] **Step 1: Add the settings class and defaults**

Create `TCNexus_Animations_Settings` with:

```php
const OPTION_NAME = 'tcnexus_card_animation_settings';

public static function get_defaults() {
    return array(
        'active_preset' => 'preset-01',
        'presets'       => array(
            array(
                'id'     => 'preset-01',
                'name'   => 'Preset 01',
                'open'   => 0.50,
                'switch' => 0.28,
                'close'  => 0.35,
            ),
        ),
    );
}
```

Implement `get_settings()`, `get_active_preset()`, and `normalize()` so every preset has a sanitized ID/name and durations clamped to `0.10`–`2.00` seconds. If a stored active ID is missing, select the first normalized preset.

- [ ] **Step 2: Register the Animations menu and submenu**

In `TCNexus_Admin_Menu::register()`, add:

```php
add_menu_page(
    'Animations',
    'Animations',
    'list_users',
    'tcnexus-animations',
    array( 'TCNexus_Animations_Settings', 'render_page' ),
    'dashicons-format-video',
    27
);

add_submenu_page(
    'tcnexus-animations',
    'Card Carousel Animation',
    'Card Carousel Animation',
    'list_users',
    'tcnexus-card-carousel-animation',
    array( 'TCNexus_Animations_Settings', 'render_page' )
);
```

The page heading will be **Card Carousel Animation** and will show the active preset, three inputs in seconds, a live explanatory preview block, a preset-name field, and Save changes / Save as preset actions.

- [ ] **Step 3: Add save handlers**

Register `admin_post_tcnexus_save_card_animation_settings` in `tcnexus-lms.php`. The handler must verify `list_users` and a nonce, then support:

```php
if ( 'save_as' === $mode ) {
    // Sanitize the submitted name, create a slug-safe unique ID, append the normalized preset, and make it active.
} else {
    // Replace the active preset’s normalized open/switch/close values and name.
}
```

Redirect to `admin.php?page=tcnexus-card-carousel-animation&saved=1` after saving. Do not remove existing presets.

- [ ] **Step 4: Add scoped backend styling**

Add `.tcn-animation-wrap`, `.tcn-animation-panel`, `.tcn-animation-fields`, `.tcn-animation-preview`, and related styles to `admin-membership.css`, reusing the existing `--tcn-*` variables, Fraunces headings, Plus Jakarta Sans fields, green accent, 4.8px button radius, and responsive breakpoint patterns.

### Task 4: Expose the active preset through REST

**Files:**
- Modify: `wordpress-plugin/tcnexus-lms/includes/class-tcnexus-rest-api.php`

- [ ] **Step 1: Add the public animation settings**

Extend `get_registration_settings()`:

```php
$settings['animations'] = array(
    'card_carousel' => TCNexus_Animations_Settings::get_active_preset(),
);
```

- [ ] **Step 2: Confirm backward-compatible fallback**

The Angular normalizer must still use Preset 01 if the API response is cached or served by an older plugin version without `animations.card_carousel`.

### Task 5: Apply timing settings to the Angular carousel preview

**Files:**
- Modify: `frontend/src/app/features/catalog/course-catalog.ts`
- Modify: `frontend/src/app/features/catalog/course-catalog.html`
- Modify: `frontend/src/app/features/catalog/course-catalog.scss`

- [ ] **Step 1: Read the active preset from the settings stream**

Add a signal initialized from `DEFAULT_CARD_ANIMATION_SETTINGS`, and update it whenever the existing registration-settings subscription emits:

```ts
protected readonly cardAnimation = signal(DEFAULT_CARD_ANIMATION_SETTINGS);

private updateCardAnimation(settings: RegistrationSettings): void {
  this.cardAnimation.set(normalizeCardAnimationSettings(settings.animations?.card_carousel));
}
```

Call `updateCardAnimation(settings)` alongside the existing settings assignment.

- [ ] **Step 2: Bind CSS duration variables on the preview**

Add style bindings to the `.preview` element:

```html
[style.--preview-open-duration.s]="cardAnimation().open"
[style.--preview-switch-duration.s]="cardAnimation().switch"
[style.--preview-close-duration.s]="cardAnimation().close"
```

- [ ] **Step 3: Replace hard-coded preview durations**

Update the existing rules without changing animation names or easing:

```scss
.preview {
  animation: preview-in var(--preview-open-duration, 0.5s) ease;
  transition:
    top var(--preview-switch-duration, 0.28s) cubic-bezier(0.22, 1, 0.36, 1),
    left var(--preview-switch-duration, 0.28s) cubic-bezier(0.22, 1, 0.36, 1);
}

.preview--closing {
  animation: preview-out var(--preview-close-duration, 0.35s) ease forwards;
}

.preview--switching {
  animation: preview-switch var(--preview-switch-duration, 0.28s) cubic-bezier(0.22, 1, 0.36, 1);
}
```

### Task 6: Verify and package the feature

**Files:**
- Modify only the files listed above.

- [ ] **Step 1: Run all Angular tests**

Run from `frontend`:

```powershell
npm test -- --watch=false
```

Expected: all test files pass.

- [ ] **Step 2: Run the production build**

Run:

```powershell
npm run build -- --no-progress
```

Expected: Angular production bundle completes in `frontend/dist/frontend`.

- [ ] **Step 3: Run syntax and diff checks**

Run from the repository root:

```powershell
node --check wordpress-plugin/tcnexus-lms/assets/admin-popup-details.js
git diff --check
```

Attempt PHP lint if `php` is available:

```powershell
php -l wordpress-plugin/tcnexus-lms/includes/class-tcnexus-animations-settings.php
```

If PHP is unavailable, manually review the new PHP class and report that limitation.

- [ ] **Step 4: Commit only feature files**

```powershell
git add frontend/src/app/core/models.ts frontend/src/app/core/registration-settings.ts frontend/src/app/core/registration-settings.spec.ts frontend/src/app/features/catalog/course-catalog.ts frontend/src/app/features/catalog/course-catalog.html frontend/src/app/features/catalog/course-catalog.scss wordpress-plugin/tcnexus-lms/tcnexus-lms.php wordpress-plugin/tcnexus-lms/includes/class-tcnexus-admin-menu.php wordpress-plugin/tcnexus-lms/includes/class-tcnexus-animations-settings.php wordpress-plugin/tcnexus-lms/includes/class-tcnexus-rest-api.php wordpress-plugin/tcnexus-lms/assets/admin-membership.css
git commit -m "Add configurable card carousel animation presets"
```

- [ ] **Step 5: Push only when explicitly requested**

```powershell
git push origin main
```

For WordPress FTP deployment, provide paths beginning from `plugins/tcnexus-lms/`. The Angular front end deploys through Vercel from the pushed repository and does not require FTP upload.

