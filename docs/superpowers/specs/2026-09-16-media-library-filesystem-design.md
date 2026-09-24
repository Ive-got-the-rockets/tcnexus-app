# Media Library File-System Organization

## Goal

Organize WordPress media into a clear file-system-style Media Library so related Course, Show, and people media are easy to find and new uploads do not create an unstructured media pool.

## Folder structure

- All Media — read-only aggregate view of every media item.
- Unsorted — media that has no recognized relationship to a Course, Show, Instructor, Guest, or Character.
- Courses & Shows — a folder for every Course and every Show, named from the current title.
- People — three fixed folders: Instructors, Guests, and Characters.

Each Course/Show folder contains all media related to that record, including thumbnails, landing backgrounds, title images, lesson/episode images, and cropped derivatives. Person media is assigned to the relevant fixed People folder.

## Assignment behavior

1. A media item is assigned to a Course/Show folder when it is selected or saved in a field belonging to that Course or Show.
2. Instructor, Guest, and Character profile media is assigned to its corresponding People folder.
3. Media with no known owner remains in Unsorted.
4. Folder names are generated from the current record title and update safely if the title changes.
5. Existing media is organized when the Media Library is opened or when a related record is saved; no media files are deleted as part of organization.

## Interface

The Media Library uses a left folder tree and a main content panel. The main panel includes breadcrumbs, item count, search, upload action, grid/list view, sorting, thumbnails, filenames, and file-type badges. The active folder is visibly highlighted.

## Safety and duplicates

Folder organization changes metadata/relationships only; it does not duplicate or delete files. The existing crop flow remains responsible for replacing a source image with its cropped version and deleting the original only after a successful crop.

## Verification

- Folder taxonomy is present and discoverable.
- Course/Show and People assignments are deterministic.
- Unlinked media appears in Unsorted.
- Renaming a Course/Show does not create a second folder.
- Existing media remains recoverable and no files are deleted during migration.
