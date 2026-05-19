# ADR-013: Horizontal Window Placement with Vertical Cascade in Next Column

*   **Status**: Accepted
*   **Date**: 2026-05-19

## Context

When spawning new browser windows (either manually or from a link inside a webview), the viewport layout needs to keep associated browsing chains logically organized. A pure vertical layout stacks everything in one long column (ADR-007), whereas a pure horizontal layout stretches everything in a single row.

To optimize the triage/browsing flow, we need a layout structure where:
1. Spawning a new panel from a reference window moves one column depth to the right.
2. Opening multiple tabs/links from that same reference window stacks those panels vertically in that newly created column.

## Decision

We refined the layout mechanics to implement a column-based cascade:
1.  **Column-Depth Alignment**: When spawning a new window (either manually via shortcut/HUD, or automatically via a link click), we position the new window `160px` to the right of the reference window (either the parent or currently active window).
2.  **Vertical Cascade in the Next Column**: The collision-avoidance helper (`findFreePosition`) continues to resolve overlapping window coordinates by shifting downwards vertically (`y = win.y + win.height + margin`). Since the starting X position is fixed at the new column boundary, any sequential or overlapping windows spawned at that same depth will stack downwards in that column rather than spilling further right.
3.  **Background Spawning for Child Links**: When a window is spawned from a parent link (`parentId` is present and not restoring state), we prevent the viewport from scrolling to the new window and do not transfer active window focus. This keeps the user on their current screen position/context, allowing them to open multiple links in the background and review them later. Manually spawned windows (e.g., via keyboard shortcut) continue to auto-scroll and focus as usual.

## Consequences

*   **Pros**:
    *   Maintains a clear columns-based structure (left-to-right represents browsing depth, top-to-bottom represents options/tabs explored at that depth).
    *   Prevents horizontal overlap while keeping parent-child link lines visually uncluttered and highly readable.
*   **Cons**:
    *   Opening very large numbers of windows at the same column level will require vertical scrolling, but the canvas-scrolling features (ADR-012) and zoom tools make this simple to navigate.
