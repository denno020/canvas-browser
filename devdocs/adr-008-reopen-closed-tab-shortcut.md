# ADR-008: Reopen Closed Tab Shortcut

*   **Status**: Accepted
*   **Date**: 2026-05-19

## Context

Users want to be able to reopen recently closed browser windows using standard browser keyboard shortcuts (`Cmd + Shift + T` on macOS, `Ctrl + Shift + T` on Windows/Linux).

## Decision

To support this shortcut regardless of focus state:
1.  **Main Window Layer (`renderer.js`)**:
    *   Maintain a `closedWindows` stack to store closed window objects along with their last known state: URL, position (`x`, `y`), size (`width`, `height`), and `parentId`.
    *   Implement keydown detection for `Cmd/Ctrl + Shift + T` to trigger `reopenLastClosedWindow()`.
    *   Pop the state from the `closedWindows` stack and call `spawnWindow` using the saved parameters (URL, position, size, parentId), bypassing overlap-avoidance checks to restore it precisely in place.
    *   Implement connection line healing: keep a mapping (`closedIdToNewIdMap`) from the closed window's old ID to its new ID. Update active children referencing the old ID, and resolve parent IDs for reopened children using this map.
    *   Remove the logic that sets active child windows' `parentId` to `null` when a parent is closed. Since IDs are strictly increasing and never reused in a session, we can leave the `parentId` intact so that if the parent is reopened, parent-child connections can be dynamically healed.
2.  **Guest webview Layer (`preload.js`)**:
    *   Extend the keydown listener in the preload script to intercept `Cmd/Ctrl + Shift + T` inside webviews.
    *   Prevent default behavior and send `ipcRenderer.sendToHost('reopen-tab')`.
3.  **Host IPC Resolver**:
    *   Update the renderer's webview IPC listener to map `'reopen-tab'` to call `reopenLastClosedWindow()`.
4.  **UI Feedback**:
    *   Add keyboard shortcut instructions for New Node and Reopen Closed Node to the HUD instructions panel.

## Consequences

*   **Pros**:
    *   Provides standard browser tab recovery behavior within a canvas spatial layout.
    *   Restores tabs exactly in their last closed coordinates, preventing random spawning.
    *   Heals connections dynamically, preserving spatial relationship flows even if elements are closed and reopened in different orders.
*   **Cons**:
    *   None.
