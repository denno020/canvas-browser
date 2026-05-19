# ADR-002: Multi-Directional Window Resizing

*   **Status**: Accepted
*   **Date**: 2026-05-19

## Context

The initial prototype only allowed resizing browser panels using a single handle at the bottom-right corner. Users need the ability to resize window frames by dragging any edge or corner in/out, matching native desktop window behaviors.

## Decision

We implemented a custom 8-directional layout system directly in the DOM using absolute-positioned handles:
1.  **Resize border divs**: Added 8 handles (`.resize-n`, `.resize-s`, `.resize-e`, `.resize-w`, `.resize-nw`, `.resize-ne`, `.resize-se`, `.resize-sw`) overlaying the bounds of each window panel.
2.  **CSS Cursor mapping**: Styled handles with relevant cursors (`n-resize`, `ne-resize`, `e-resize`, etc.) and set their pointer event active areas to a comfortable 12px depth.
3.  **Coordinate space offset formulas**:
    *   For right/bottom extensions (`e` and `s`), we increment width/height by the delta client position.
    *   For left/top resizing (`w` and `n`), we dynamically recalculate the coordinate `x` or `y` alongside expanding the width/height to ensure the panel's opposite borders stay visually stationary.
4.  **Zoom correction**: Divided the screen delta (`dx` and `dy`) by the active canvas `zoom` factor before resizing, guaranteeing that dragging behaves consistently regardless of the canvas scale.

## Consequences

*   **Pros**: Highly responsive window scaling. Resizing behaves naturally under all zoom settings.
*   **Cons**: Border handles take up overlay space around the panel frame; they must have precise z-indexing (`z-index: 105`) to sit above the page contents but under drag operations.
