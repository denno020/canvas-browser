# ADR-006: New Tab Keyboard Shortcut

*   **Status**: Accepted
*   **Date**: 2026-05-19

## Context

Users expect standard browser keyboard shortcuts to work seamlessly within the application. Specifically, the "New Tab" shortcut (`Cmd + T` on macOS, `Ctrl + T` on Windows/Linux) should trigger the creation of a new spatial window panel on the canvas, equivalent to clicking the "New Node" button in the HUD.

## Decision

To support this shortcut regardless of focus state, we implemented hotkey capture at both layers of the application structure:
1.  **Main Window Layer (`renderer.js`)**: Added a keydown listener on the global `window` object to capture `Cmd + T` / `Ctrl + T` keys when focus is on the canvas background, HUD, title bar, or inputs.
2.  **Guest webview Layer (`preload.js`)**: Since keyboard events inside the `<webview>` processes do not bubble up to the main window, we extended the keydown listener in the preload script. It intercepts `Cmd + T` / `Ctrl + T` inside guest sites, halts the browser default action, and triggers `ipcRenderer.sendToHost('new-tab')`.
3.  **Host IPC Resolver**: The renderer's webview IPC listener maps the `'new-tab'` channel to trigger `spawnWindow('https://www.google.com')`, creating a new panel at the current viewport center.

## Consequences

*   **Pros**: Natural, standard browser shortcut behavior is maintained across the entire application interface regardless of focus.
*   **Cons**: None. Standard web page keyboard shortcuts for spawning tabs are bypassed, which is the intended behavior for our canvas workspace.
