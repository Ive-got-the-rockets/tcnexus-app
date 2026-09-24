# Course Level Tabs Design

## Goal

Replace the single Course Level selector in the Course Builder with Beginner,
Intermediate, and Advanced tabs. Each tab represents a complete, independent
version of the same course while the front end continues to show one course
card.

## Agreed behavior

- A course may have one, two, or all three levels.
- Each configured level has its own title, description, course type, desktop
  and mobile imagery, instructor, guest, overview/trailer links, and lessons.
- The existing real courses are migrated into the Beginner level without
  losing any current values or lesson relationships.
- A course card shows badges only for levels that are configured.
- Level badge switching on the front end is a follow-up interaction; this
  change prepares and exposes the data but does not redesign that interaction.

## Data model

Keep one `tc_course` post per front-end card. Store the level-specific course
fields in one structured `_tcnexus_course_levels` post meta value keyed by
`beginner`, `intermediate`, and `advanced`. Each level object contains its
enabled state and the fields listed above.

Add `_tcnexus_course_level` metadata to lessons. Existing lessons without a
level are treated as Beginner. Saving a level tab updates only that level's
lesson set, while preserving the other levels.

The existing single-level fields remain readable as a compatibility fallback,
with existing values mapped to Beginner during migration. The REST response
will add a `levels` object and a configured-level list while retaining current
top-level fields for existing consumers.

## Course Builder

- Replace the Course Level dropdown with three tabs at the top of the course
  details area.
- The active tab determines the displayed level label; the level itself is
  read-only text, not a selector.
- Move the Course Level display to the current Author position.
- Move Author to the current Course Level position.
- Render independent fields and lesson rows for each level.
- Allow a level to be enabled/configured without forcing the other levels to
  exist.
- Save all edited levels in one normal course save, preserving unsaved-change
  protection and the existing media/person pickers.

## Front-end contract

The API will return configured levels in a stable order: Beginner,
Intermediate, Advanced. Each level includes its own details and lessons. The
current card, expanded card, and course-preview modal will receive the level
badges and level-aware data without changing the existing visual treatment in
this phase.

## Migration and safety

- Existing course fields and lessons become Beginner data.
- Existing published course IDs and URLs remain unchanged.
- No existing course or lesson is deleted.
- A missing level value defaults to Beginner for backward compatibility.
- The admin save process must validate level keys and ignore unknown keys.

## Verification

- Create a new course and populate only Beginner.
- Add Intermediate details and confirm Beginner remains unchanged.
- Add Advanced details and confirm all three tabs retain their own values.
- Edit an existing course and verify its current details appear under Beginner.
- Confirm lesson lists remain separated by level.
- Confirm the API continues returning legacy fields plus the new level data.
- Confirm the front end shows only configured level badges.
