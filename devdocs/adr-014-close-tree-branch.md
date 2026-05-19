# ADR-014: Close Tree Branch Feature

*   **Status**: Accepted
*   **Date**: 2026-05-19

## Context

When users open links from a window into new windows, a "tree" of parent-child relationships is formed, complete with SVG connection lines indicating the lineage. Users requested the ability to close a specific "branch" of this tree—closing the selected window and cascading the close operation down to all child windows (and their children) originating from it, while leaving the rest of the workspace intact.

## Decision

We implemented a custom, DOM-based context menu within the renderer process (`src/renderer.js`, `src/index.html`, `src/styles.css`) rather than relying on native OS context menus.
1. **Context Menu System**: A beautifully styled, glassmorphic HTML context menu was added, intercepted via a global `contextmenu` listener on the `window`. It differentiates between right-clicking on a browser window (showing window-specific actions) vs. the canvas background (showing canvas-level actions like "Fit All").
2. **Recursive Descent**: A `getDescendantIds(rootId)` helper function traces the `parentId` properties across the `windows` array to collect all transitive children of a given window.
3. **Closing Logic**: The "Close Branch" action calls `closeWindow()` on the target window and all IDs collected by `getDescendantIds()`. A "Close Children Nodes" action was also added to close only descendants while keeping the parent open.
4. **Visual Highlights**: Hovering over destructive actions in the context menu actively highlights the targeted windows and SVG connections in red, providing immediate tactile feedback about what will be closed.

## Consequences

*   **Pros**: Provides powerful bulk-window management aligned with the spatial canvas philosophy. The custom context menu and hover-highlighting deliver an extremely premium, native-feeling user experience that exceeds standard browser tabs.
*   **Cons**: Relies on `parentId` data integrity. Reopening a closed branch currently only reopens the root window, as historical parent-child relationships of multiple simultaneously closed windows are not grouped into a single "branch state" for restoration.
