# ADR-005: Electron Main Window Size and Position Persistence

*   **Status**: Accepted
*   **Date**: 2026-05-19

## Context

The initial application opened at a static hardcoded size (`1400x900`). The window needed to be larger by default to accommodate spatial canvas views, and it needed to automatically remember its layout size, window placement coordinate, and maximized state from the previous session.

## Decision

We implemented standard file-based state serialization in the main process (`main.js`):
1.  **Default Dimensions**: Set default startup dimensions to a wider `1600x1000` resolution.
2.  **App Data Directory Store**: Configured window state tracking to write to `window-state.json` inside the platform's user data path: `app.getPath('userData')`.
3.  **Startup Restore**: At boot, we check if the state file exists. If present, we initialize the `BrowserWindow` with saved bounds (`x`, `y`, `width`, `height`) and call `maximize()` if it was previously maximized.
4.  **Save Events**: Hooked `resize`, `move`, and `close` events on the window to dynamically write the bounds (ignoring width/height changes during maximized state to preserve original size when unmaximizing) back to the state file.

## Consequences

*   **Pros**: Smooth, native-feeling window lifecycle management. Works seamlessly across runs in both development and production.
*   **Cons**: Storing coordinates can occasionally launch the window outside viewport boundaries if external monitor setups change; however, Electron handles offscreen position adjustments gracefully on modern OS versions.
