# Shows Builder Design

## Goal

Add a backend Shows area that uses the exact Course Builder workflow and visual language, while creating show content under the existing Shows category.

## User experience

- Add a `Shows` item to the backend navbar.
- The Shows landing screen mirrors the Course Builder list screen: browse existing entries, create a new entry, and open an entry for editing.
- The Shows editor mirrors the Course Builder tabs and publishing flow, including media, overview, lessons/content, and save/publish states.
- Shows are always assigned to the existing `Shows` category. The category is not presented as a user-editable choice in the Shows flow.
- The people area is renamed `Characters` and supports selecting multiple reusable character profiles.
- Instructor and Guest controls are not shown in the Shows flow.
- Existing Course Builder behavior remains unchanged.

## Architecture

Use a shared Course/Show builder mode rather than duplicating the builder UI. The mode supplies:

- content type and route identifiers;
- display labels and empty-state copy;
- fixed category behavior for Shows;
- the people field configuration (`Instructor`/`Guest` for Courses, multi-select `Characters` for Shows);
- persistence mappings for the corresponding WordPress data.

The existing Course Builder remains the default mode. Shows use the same markup, styles, client interactions, media picker, lesson editor, validation, and save/publish lifecycle wherever the behavior is identical.

## Data and persistence

Shows need a distinct content type or equivalent type discriminator so they can be listed and edited independently of Courses. Character profiles are reusable records and a Show may reference multiple profiles. The API/admin serialization must expose the character references needed by the builder and preserve them across edits.

The Shows category must be enforced server-side as well as in the UI; a client request must not be able to save a Show into another category.

## Validation and failure handling

- A new Show starts with the Shows category already selected/enforced.
- Saving a Show retains all selected Characters and lesson data.
- Invalid or missing referenced Characters are ignored safely or reported using the existing builder error behavior; they must not break the editor.
- Course saves and existing Instructor/Guest assignments must remain compatible.

## Verification

- Add focused tests for Shows-mode configuration, fixed category behavior, and multi-character serialization/persistence.
- Run the existing frontend test suite and production build.
- Run the WordPress plugin test/lint checks available in the repository.
- Manually verify the backend navbar entry, list screen, create/edit flow, category lock, character multi-select, save/reopen behavior, and that the Course Builder still works.
