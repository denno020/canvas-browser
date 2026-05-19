# ADR-012: Smarter Canvas Scrolling and Panning

*   **Status**: Accepted
*   **Date**: 2026-05-19

## Context

The spatial browser supports panning the canvas via `Space + Left Drag` or `Middle Click Drag`. However, when the mouse cursor is over a browser window containing an Electron `<webview>`, the guest web page captures mouse events. Consequently, panning doesn't start or gets hijacked/frozen if the cursor moves over a window during a drag. Additionally, pressing space while typing inside form inputs or textareas in the guest webview incorrectly triggers panning mode.

## Decision

We resolved these issues with the following implementation details:
1.  **WebView Pointer Events Toggle**: Added CSS rules targeting `.browser-window` inside `styles.css`. When the body has `space-pressed` or `panning-active` classes, pointer events are disabled on all browser windows (`pointer-events: none !important`), forcing mouse events to fall through to the canvas viewport.
2.  **Input Focus Filtering**: Updated `preload.js` and `renderer.js` keydown listeners to inspect if the active element is an input, textarea, select, option, or contenteditable. Space bar key events are only captured and sent to the host if no such input is focused.
3.  **Keyboard Propagation from Guest**: Listened to keydown/keyup events inside the webview preload script, checking input focus state, preventing the default page scroll, and sending IPC messages (`space-keydown`, `space-keyup`) to update the host's `spacePressed` state.
4.  **Middle-Click Intersection & Link Bypass**: Intercepted middle mouse down (`mousedown` with button 1) inside the webview preload script. We traverse the event path (`e.composedPath()`) to check if the user clicked a link (`<a>`, `href`, or `role="link"`). If a link is clicked, we bypass the panning event to let Chromium's native middle-click handler trigger link opening in a new window. Otherwise, we send the event to the host with guest coordinates to initiate canvas panning and activate the `panning-active` class.
5.  **Robust Clean-Up**: Adjusted mouseup listeners to clean up `panning-active` and conditionally `space-pressed` classes only when the user finishes dragging, preventing early state release if space is released mid-drag.

## Consequences

*   **Pros**: Smooth, intuitive panning/scrolling across the entire screen regardless of window overlays. Web pages inside webviews no longer hijack mouse movements once drag starts.
*   **Cons**: None.
