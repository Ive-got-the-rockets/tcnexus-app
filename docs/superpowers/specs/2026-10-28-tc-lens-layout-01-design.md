# TC Lens Layout 01 Design

## Goal

Create a separate local Angular page named **TC Lens Layout 01** at `/tc-lens-layout-01`. The page establishes a four-frame learning workspace without changing the current lesson-player page or the existing TC Lens app behavior.

## Approved Structure

The desktop page contains four regions:

1. A thin, full-width top frame for TC Nexus login and account details.
2. An upper-left iframe containing the existing TC Nexus lesson player at `/courses/55/lessons/5501?level=beginner`, which loads Mastering the Greeks lesson 1 through the shared Plyr experience.
3. A lower-left frame reserved for the LLM experience. This frame is exactly `250px` tall.
4. A tall right-hand frame containing the existing TC Lens app iframe. Its current source and app behavior remain unchanged, and its column is exactly `400px` wide.

The top account frame spans both columns. Below it, the video and LLM frames form a stacked left column while the app iframe spans the combined height of both left frames.

## Architecture

Add a focused, standalone Angular component for this layout and register it as the `/tc-lens-layout-01` route. Do not add a mode to the existing `LessonPlayerPage`; that component and its routes remain unchanged.

The new component owns the layout presentation, local lesson-player iframe, and initial LLM placeholder content. Existing TC Lens URL-building behavior should be reused for the app iframe rather than duplicated. The app iframe uses the same current TC Lens target used by the existing experience. The video iframe reuses the complete existing lesson-player route rather than duplicating or extracting Plyr behavior.

## Responsive Behavior

At desktop widths, the page uses the approved two-column layout. The right app column is fixed at `400px`, while the left workspace consumes all remaining width. All frame gaps are `4px`.

At narrow widths, the grid becomes one column in this order:

1. Login/account frame
2. Video frame
3. LLM frame
4. App iframe

The page must not create horizontal scrolling. The lesson-player iframe preserves a 16:9 aspect ratio. The LLM frame remains exactly `250px` tall at every width. The layout uses vertical scrolling when the viewport is too short, ensuring the LLM frame is never clipped at the bottom. The app iframe remains `400px` wide where the viewport permits; on narrower viewports it is constrained to the available width while staying centered.

## Initial Content and States

- The login/account frame contains clearly labeled local placeholder account details.
- The video frame loads `/courses/55/lessons/5501?level=beginner` in a same-origin iframe, reusing the existing Plyr-based lesson player.
- The LLM frame is a labeled placeholder for the future LLM interface.
- The right frame loads the existing TC Lens app in a real iframe.
- Each iframe has an accessible title.
- If the external app refuses or fails to render, the surrounding page layout remains stable; browser-level iframe errors are not replaced with a custom recovery flow in this first layout prototype.

## Styling

Use the existing TC Nexus dark visual language and spacing conventions. Frames have clear boundaries and labels so the prototype is easy to evaluate. Styling stays scoped to the new component and does not modify global page behavior.

## Testing and Verification

Automated tests will verify:

- `/tc-lens-layout-01` resolves to the new page.
- The four regions render in the approved semantic order.
- The right region contains the existing TC Lens app URL.
- The layout uses `4px` gaps and a fixed `400px` desktop app column.
- The LLM region is exactly `250px` tall on desktop and narrow layouts and remains reachable on short windows.
- The new component does not alter the existing lesson-player route.

Browser verification will check the desktop grid, the narrow stacked layout, horizontal overflow, iframe sizing, and the browser console.

## Out of Scope

- Replacing the existing lesson player.
- Adding independent course-data loading or lesson switching logic to the layout page.
- Implementing the LLM chat experience in the lower-left frame.
- Changing TC Lens authentication, messaging, or iframe application behavior.
- Adding production navigation to this prototype route.
