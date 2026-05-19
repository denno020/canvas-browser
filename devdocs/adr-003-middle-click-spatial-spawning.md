# ADR-003: Spatial Spawning for Middle-Clicks and target="_blank"

*   **Status**: Accepted
*   **Date**: 2026-05-19

## Context

When clicking links configured to open in a new window (e.g., `<a target="_blank">`) or when middle-clicking links inside a canvas browser panel, Electron default behavior was to either open a native OS window outside the canvas, or ignore it. These links need to open inside a new browser panel *within* the canvas workspace, maintaining parent-child connection lines.

## Decision

In modern Electron, the renderer-side `new-window` event on `<webview>` is deprecated or unreliable. To resolve this:
1.  **Global WebContents Interception**: Hooked the `web-contents-created` event in the main process (`main.js`).
2.  **`setWindowOpenHandler`**: Registered a handler on all webContents (including guest webviews) that intercepts window opening operations, extracts the requested `url`, blocks the default native creation by returning `{ action: 'deny' }`, and sends an IPC event `spawn-spatial-window` to the main window.
3.  **Renderer IPC Mapping**: The renderer process listens for the IPC message, identifies the parent panel webview matching the `parentWebContentsId` (using `getWebContentsId()`), and spawns a new spatial window positioned cascaded to the right of the parent.

## Consequences

*   **Pros**: 100% reliable interception of middle-clicks, standard `window.open()`, and `target="_blank"` link clicks inside webviews.
*   **Cons**: Requires IPC traffic between the main process and the renderer. Webviews must be fully attached to identify their `webContentsId`.
