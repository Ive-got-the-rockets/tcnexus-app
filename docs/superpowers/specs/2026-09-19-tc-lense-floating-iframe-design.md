# TC-Lense Floating iframe Design

## Goal

Allow the TC app iframe opened by TC-Lense to detach from the right-side panel into a floating, draggable, resizable window while returning the video to the mode it had before TC-Lense opened.

## Approved interaction

- Docked TC-Lense keeps the existing right-side panel and split video layout.
- The selected “Window lift” icon detaches the iframe into a floating panel.
- Detaching restores the prior video presentation mode: windowed or theater.
- The floating panel can be dragged by its header and resized from its edges/corner.
- Position and dimensions are remembered for the current browser visit and reused on the next detach.
- The floating control changes to the matching dock icon.
- Docking returns the iframe to the right-side panel and reapplies the TC-Lense split layout.

## Implementation shape

Extend `LessonPlayerPage` with a detached signal and remembered geometry. Capture the player’s presentation state when TC-Lense opens, then use the existing X-Ray placement path for docked mode and a separate fixed geometry path for the floating panel. Keep the iframe element and its session intact; only its outer panel changes position and size.

The floating panel will have a compact header containing the TC-Lense label, dock control, and a resize affordance. Pointer dragging is handled by the header, while native CSS resize handles the panel dimensions. Geometry is clamped to the viewport with a minimum usable size and a maximum size that leaves a visible margin. Geometry is stored in `sessionStorage` so it survives docking and re-detaching in the same visit without becoming a persistent cross-visit preference.

## Video mode behavior

When the side panel opens, capture whether the player is in its normal windowed layout or theater/fullscreen layout. On detach, close the docked X-Ray geometry and restore that captured mode. On dock, re-enable the existing side-panel geometry. Fullscreen transitions must continue to recalculate placement and must not leave stale inline dimensions on the video or controls.

## Verification

- TypeScript build passes.
- Existing lesson-player behavior remains unchanged when the iframe is docked.
- Detach/dock changes only the TC app panel and the intended video layout.
- Dragging and resizing do not interact with the cross-origin iframe content.
- Geometry is restored after a dock/detach cycle and remains inside the viewport after resize.
- Reduced-motion styles continue to avoid unnecessary animation.
