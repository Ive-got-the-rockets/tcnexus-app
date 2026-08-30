# Registration Popup and Admin Settings Design

## Goal

Make the free-view registration flow behave as approved in the mockup and give WordPress administrators control over the registration popup copy, button labels, and media shown above the heading.

## User experience

1. An anonymous visitor opens the final free lesson allowed by the configured free-view limit.
2. Access is granted, but the frontend opens the registration popup before initializing playback.
3. The popup uses the configured registration heading, message, submit button label, and optional media.
4. If the visitor registers, the modal closes and the lesson starts with registered access.
5. If the visitor closes the popup without registering, a second popup opens immediately. This popup uses its own configurable heading, message, and button label, and keeps the email field available.
6. If the visitor closes the second popup without registering, the lesson starts. This is the final free lesson.
7. Any later lesson that requires registration shows the existing blocked state with clearer copy and an action to open the registration popup.

The first popup heading defaults to “Register to continue watching.” The follow-up heading defaults to “This will be your last free lesson.” Existing saved installations receive these defaults automatically.

## WordPress administration

Add a “Registration Settings” submenu under the existing TC Nexus Membership menu. The screen will contain two copy sections:

- Registration popup: heading, message, and submit button label.
- Final-free-lesson popup: heading, message, and submit button label.

The screen will also contain one media section shared by both registration states:

- Media type: None, Image, or Video.
- Media URL: a URL selected through the WordPress media picker or entered as a video URL.
- Image alt text when media type is Image.

For video, the frontend will render a muted, autoplaying, looping native HTML5 video element without controls. It will use a constrained height so the modal remains usable on mobile. Unsupported or empty media settings fall back to no media without breaking registration. Settings are stored as one sanitized option array under `tcnexus_registration_settings` and saved with a WordPress nonce and capability check.

## API and frontend data flow

Add a public `GET /wp-json/tcnexus/v1/registration-settings` endpoint. It returns the sanitized public settings only; no WordPress internals or admin-only fields are exposed. The response contains the two popup copy objects and the optional media object.

The Angular `AccessService` will load the settings once and cache them for the app session. The registration modal will use the loaded values, with local defaults available if the request fails so the auth flow remains usable during an API or configuration outage.

The lesson player will preserve the successful `/access/check` response. When the response indicates that the anonymous visitor has just reached the free limit, it will set the lesson aside, open the registration modal, and defer player initialization until the modal closes. Closing the first modal without registering will transition to the follow-up state rather than rechecking access. Closing the follow-up modal will initialize the player. Completing registration will also initialize the player after the modal closes.

The registration modal will support an explicit flow state for the threshold warning so it can distinguish a normal registration prompt, the final-free-lesson follow-up, login, success, and error states without relying on timing.

## Error handling

- Invalid or duplicate email behavior remains unchanged.
- Settings endpoint failure uses frontend defaults and does not block registration.
- Missing media URL or invalid media type renders no media.
- A video is never required for playback access; it is promotional/instructional content inside the registration modal.
- The backend remains the source of truth for access limits. The frontend only decides when to show the warning based on fields already returned by `/access/check`.

## Testing and verification

- Add unit coverage for recognizing the final anonymous free lesson.
- Add unit coverage for the modal transition: first popup close → follow-up popup; follow-up close → playback; registration success → playback.
- Add API-side coverage or a focused PHP/static verification for settings sanitization, capability checks, and the public response shape where the project’s current test tooling permits.
- Run the Angular test suite and production build.
- Manually verify with the free-view limit set to 2: first lesson plays, second lesson opens the first popup, closing it opens the follow-up, closing that starts the second lesson, and the third lesson requires registration.

## Scope boundaries

This change does not add password reset, profile editing, payment checkout, or a new account model. It does not change the backend’s configured free-view limit or registered/paid access rules.
