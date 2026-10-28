# TC Lens Layout 01 Design

## Goal

Create a separate local Angular page named **TC Lens Layout 01** at `/tc-lens-layout-01`. The page establishes a four-frame learning workspace without changing the current lesson-player page or the existing TC Lens app behavior.

## Approved Structure

The desktop page contains four regions:

1. A thin, full-width top frame for TC Nexus login and account details.
2. An upper-left frame reserved for the lesson video.
3. A lower-left frame reserved for the LLM experience. This frame must never be shorter than `300px`.
4. A tall right-hand frame containing the existing TC Lens app iframe. Its current source and app behavior remain unchanged.

The top account frame spans both columns. Below it, the video and LLM frames form a stacked left column while the app iframe spans the combined height of both left frames.

## Architecture

Add a focused, standalone Angular component for this layout and register it as the `/tc-lens-layout-01` route. Do not add a mode to the existing `LessonPlayerPage`; that component and its routes remain unchanged.

The new component owns only layout presentation and initial placeholder content. Existing TC Lens URL-building behavior should be reused for the app iframe rather than duplicated. The app iframe uses the same current TC Lens target used by the existing experience.

## Responsive Behavior

At desktop widths, the page uses the approved two-column layout. The left workspace is slightly wider than the right app column, while preserving enough width for the embedded app to remain usable.

At narrow widths, the grid becomes one column in this order:

1. Login/account frame
2. Video frame
3. LLM frame
4. App iframe

The page must not create horizontal scrolling. The video placeholder preserves a 16:9 aspect ratio. The LLM frame retains its `300px` minimum height at every width. The app iframe receives a practical mobile minimum height so it does not collapse.

## Initial Content and States

- The login/account frame contains clearly labeled local placeholder account details.
- The video frame is a labeled placeholder for the future video player.
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
- The LLM region has a `300px` minimum height.
- The new component does not alter the existing lesson-player route.

Browser verification will check the desktop grid, the narrow stacked layout, horizontal overflow, iframe sizing, and the browser console.

## Out of Scope

- Replacing the existing lesson player.
- Implementing the actual video player in the upper-left frame.
- Implementing the LLM chat experience in the lower-left frame.
- Changing TC Lens authentication, messaging, or iframe application behavior.
- Adding production navigation to this prototype route.
