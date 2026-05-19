# ADR-011: Spatial Tab Close Shortcut Customization

*   **Status**: Accepted
*   **Date**: 2026-05-19

## Context

The Spatial Canvas Browser runs within an Electron shell. By default, Electron maps `Cmd+W` (macOS) and `Ctrl+W` (Windows/Linux) to the standard `close` role of the application menu, which terminates the active Electron `BrowserWindow`. As a result, when a user pressed the standard close shortcut expecting to close the currently active node/tab on the canvas, the entire application closed instead.

## Decision

To redirect the close tab shortcut to target individual active canvas nodes:
1.  **Custom Application Menu**: In `src/main.js`, initialized a custom application menu via `Menu.buildFromTemplate` and `Menu.setApplicationMenu` to override the default Electron window-close behavior:
    *   Mapped `CmdOrCtrl+W` to "Close Tab", which dispatches a `close-active-window` IPC message to the renderer process.
    *   Mapped `CmdOrCtrl+Shift+W` to "Close Window", allowing users to still close the main application window via keyboard if desired.
    *   Retained standard application, editing, viewing, and layout menu items to ensure Copy/Paste and other default accelerators still function natively.
2.  **Window Close Refactor**: Refactored the window-removal logic in `src/renderer.js` out of the DOM click handler and into a reusable global `closeWindow(id)` function.
3.  **Active Focus Restoration**: Modified the close routine such that if the currently active/focused window is closed, the next topmost window (based on z-index) or the remaining window is automatically activated and focused.
4.  **IPC Dispatch**: Wired up the `close-active-window` listener in the renderer to close the currently active canvas window.
5.  **Page-Level Fallbacks**: Registered keyboard event interceptors for `CmdOrCtrl+W` within both the host window context (`src/renderer.js`) and the guest `<webview>` context (`src/preload.js` forwarding a `close-tab` IPC message) to ensure focus-trapped keys are captured and handled correctly.

## Consequences

*   **Pros**:
    *   Keyboard interactions feel natural and align with web browser tab closing standards.
    *   Multiple nodes can be closed in sequence using subsequent shortcut presses due to z-index focus cascading.
    *   OS window-closing behavior is still accessible using standard window buttons or the new `Cmd+Shift+W` / `Ctrl+Shift+W` shortcut.
*   **Cons**:
    *   Defining a custom Application Menu requires manual declarations for basic functionalities like Undo/Redo and Copy/Paste, though this is minimized by leveraging Electron's native menu roles.
