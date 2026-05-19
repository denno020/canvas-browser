# ADR-007: Smart Window Placement and Centering

*   **Status**: Accepted
*   **Date**: 2026-05-19

## Context

When spawning new browser windows (manually or via link redirection), they were originally placed in static positions: either exactly in the viewport center, or at a fixed offset to the right of the parent. This caused new windows to cover and completely hide existing windows if multiple panels were spawned in sequence. In addition, the viewport did not adapt to new panel creation, forcing the user to manually pan around the infinite canvas to find the newly opened page.

## Decision

We implemented collision-avoidance layout generation coupled with a smooth viewport camera tracking system:
1.  **Collision Avoidance Helper (`findFreePosition`)**:
    *   Computes standard axis-aligned bounding box (AABB) intersection checks between a proposed rectangle (including a `60px` buffer margin) and all active canvas windows.
    *   If a collision is detected, the algorithm shifts the proposed coordinate downwards (`y = win.y + win.height + margin`) below the collided window and repeats the scan until a completely clear pocket of canvas is found.
2.  **Smooth Viewport Centering (`scrollToWindow`)**:
    *   Calculates the required panning offset (`panX` and `panY`) to align the center of the newly spawned panel with the center of the browser application window at the current `zoom` scale.
    *   Uses a hardware-accelerated CSS transition class (`.smooth-pan`) set on the `#canvas` containing a custom easing function (`cubic-bezier(0.16, 1, 0.3, 1)`) to animate the translation over `600ms`.
    *   Automatically cleans up and strips the transition class via `setTimeout` after completion to ensure manual drag-panning experiences remain instant and lag-free.

## Consequences

*   **Pros**:
    *   No panels are ever layered or hidden on top of each other.
    *   Extremely premium and immersive UX feel with smooth camera movement tracking the browsing journey.
*   **Cons**:
    *   Successive manual spawns will extend down in a column. However, this is predictable and fits with standard page triage workflows.
