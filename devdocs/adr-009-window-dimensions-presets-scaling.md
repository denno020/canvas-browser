# ADR-009: Window Dimensions, Size Presets, and Canvas-Relative Scaling

*   **Status**: Accepted
*   **Date**: 2026-05-19

## Context

The initial browser prototype generated window panels with a fixed size (750x500 pixels) that did not adapt to the viewport. Users requested three enhancements to improve resizing usability and responsive behavior:
1.  **Dynamic Dimension Display**: Show exact width and height of a window in its corner dynamically during drag-resizing.
2.  **Preset Dimensions**: Jump to standard window dimensions easily (e.g. Small, Medium, HD, Large, Full HD) directly from the window title bar.
3.  **Canvas-Relative Scaled Spawn**: New window panels should start as a square shape at approximately 80% of the viewport height relative to the 100% zoom level, ensuring that zooming out does not cause new windows to consume disproportionate screen real estate.

## Decision

To support these enhancements, we implemented the following changes:

1.  **Dynamic Resize Badge**:
    *   Added a `.window-dimensions-badge` element to each `.browser-window` panel showing the current width and height.
    *   Styled the badge with absolute positioning at the bottom-right corner, standard backdrop blur, and transitions to fade in when the window is resizing and fade out when resizing ends.
    *   Added a `.resizing` CSS class to the window wrapper when a drag-resize starts, and removed it on mouse release (`mouseup`).
    *   Updated the badge text dynamically during drag resizing using the calculated zoomed-offset dimensions inside the global `mousemove` handler.

2.  **Preset Size Dropdown**:
    *   Added a styled HTML `<select>` dropdown inside the title bar (`.action-controls` container) containing preset dimensions: Compact Square (600x600), Standard Square (800x800), Large Square (1000x1000), Mobile Portrait (390x844), Narrow Column (600x1000), Wide Column (800x1200), and Tall Reader (1000x1500).
    *   Styled the dropdown to look like a modern pill button with a custom SVG chevron background, hiding the default select arrow via `-webkit-appearance: none`.
    *   Registered a `change` event listener on the select element to dynamically update the active window's styling bounds and update any parent-child connections. The dropdown value is then immediately reset to its default placeholder.
    *   Excluded the dropdown from initiating drag actions on the window title bar.

3.  **Canvas-Relative Scaled Spawn**:
    *   Updated `spawnWindow` to query the canvas container's bounding rectangle (`getBoundingClientRect()`) to determine the current viewport dimensions.
    *   Defined the default spawn width and height to be equal to 80% of the canvas container's physical pixel height, creating a default square shape (falling back to 800x800 if the container is not rendered).
    *   By defining this default size in canvas coordinates rather than screen coordinates, the window scales appropriately with the canvas zoom factor (e.g., a square window spawned while zoomed out to 10% will appear as an 80x80 layout component on screen, preserving its canvas-native proportions relative to 100% zoom).

## Consequences

*   **Pros**:
    *   Significant UX improvement for drag resizing, providing visual precision.
    *   Quick access to standard square and portrait column dimensions optimized for vertical scrollable web layouts directly inside the spatial layout environment.
    *   Adaptive spawning size that naturally matches the user's monitor resolution and zoom levels.
*   **Cons**:
    *   None.
