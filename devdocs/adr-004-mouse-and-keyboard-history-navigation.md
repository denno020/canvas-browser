# ADR-004: Mouse & Keyboard History Navigation in Webviews

*   **Status**: Accepted
*   **Date**: 2026-05-19

## Context

When navigating websites inside canvas browser windows, mouse back/forward side buttons (buttons 3 and 4) and common navigation keyboard shortcuts (like `Alt + Left Arrow` / `Cmd + Left Arrow` for back, and `Alt + Right Arrow` / `Cmd + Right Arrow` for forward) were ignored by default inside Electron's `<webview>` component.

## Decision

To bypass operating system differences and Electron input-mapping inconsistencies, we implemented a cross-process guest event forwarding loop:
1.  **Preload Script (`preload.js`)**: Created a preload script injected into the guest contexts. This script runs in the guest page's DOM context and has direct access to standard events:
    *   Registers a `mouseup` listener capturing `e.button === 3` and `e.button === 4`.
    *   Registers a `keydown` listener capturing alt-key/meta-key modifications matching `'ArrowLeft'` or `'ArrowRight'`.
    *   Fires `ipcRenderer.sendToHost('go-back' | 'go-forward')` when triggered, preventing default page behavior.
2.  **Webview Host Listener**: In `renderer.js`, we hook the `'ipc-message'` event on the host `<webview>` tags to listen for `'go-back'` and `'go-forward'` channels, calling `webview.goBack()` and `webview.goForward()` to navigate history.

## Consequences

*   **Pros**: Highly reliable, cross-platform history navigation mapping standard OS mouse triggers and keyboard layouts (Windows, Linux, macOS).
*   **Cons**: Relies on a preload script, meaning the preload script must be present and correctly resolved using an absolute path (`path.join(__dirname, 'preload.js')`).
