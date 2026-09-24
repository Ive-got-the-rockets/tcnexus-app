# Per-Episode Guest Assignments

## Goal

Move guest assignment from the course/show level to the individual video episode builder. Each `tc_lesson` video can have zero, one, or multiple guests.

## Approved interaction

Inside every expanded episode editor, add a **Guests for this episode** field:

1. An inline dropdown lists available guest people.
2. An **Add guest** action assigns the selected person to that episode.
3. Assigned guests appear directly below as compact rows/chips showing photo, name, and a remove control.
4. A guest can be removed without affecting any other episode.
5. The empty state explains that no guests have been assigned yet.

The control is inline in the episode editor; it is not a separate modal or central assignment screen.

## Data model and compatibility

- Store the assignment on the lesson post as an array of person IDs under a dedicated lesson meta key, `_tcnexus_lesson_guest_ids`.
- Sanitize IDs with `absint`, remove duplicates, and retain only valid guest person posts.
- Load the saved IDs when rendering both the course builder's Episodes card and the Global Episodes List editor.
- Submit the IDs with each episode's existing save payload.
- Expose the assigned guest people in lesson REST responses as a `guests` array, preserving the existing person shape (`id`, `name`, `photo`).
- Keep the existing course-level `guest_id` field readable for backwards compatibility. New episode assignments take precedence; the old course-level guest is used only as a fallback when an episode has no explicit assignment.

## Scope

- Applies to every video episode (`tc_lesson`) in both course and show builders.
- The existing show Characters field remains course/show-level and is unchanged.
- The existing course-level Instructor field remains unchanged.
- No front-end layout changes are part of this task.

## Validation

- Existing lesson save/delete behavior remains intact.
- Multiple guests can be added to one episode and are persisted after reload.
- Removing a guest only changes the current episode.
- New episodes start with an empty guest list.
- Existing episodes without per-episode guest data continue showing their legacy course-level guest until explicitly edited.
- REST lesson output includes the per-episode guest list.
