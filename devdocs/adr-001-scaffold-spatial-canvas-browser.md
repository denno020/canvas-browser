# ADR-001: Scaffolding the Spatial Canvas Web Browser

*   **Status**: Accepted
*   **Date**: 2026-05-19

## Context

The initial requirement is to create a prototype of an infinite 2D spatial canvas browser. It needs to lay out standard websites into individual modules, allowing users to navigate around a larger-than-screen workspace by panning and zooming, while tracking page navigation parent-child links visually.

## Decision

We scaffolded the project as a zero-dependency Electron, HTML, CSS, and Vanilla JavaScript application, utilizing:
1.  **CSS 2D Transforms (`transform: translate(x, y) scale(s)`)** applied to a large `#canvas` container inside a viewport container to implement smooth panning and zooming. Panning maps to Middle-Click or `Space + Left Drag`.
2.  **Absolute Positioned Panels** inside the `#canvas` representing browser windows.
3.  **Electron `<webview>` Tag** configured with `webviewTag: true` in the main process to securely and independently render full web contexts inside the canvas divs.
4.  **SVG Bezier Connections**: An S-curve rendering module (`M x1 y1 C ...`) nested in the canvas coordinate system, creating paths linking parent frames to spawned child pages.
5.  **Click Spawning Toggle**: Introduces "Link Spawning Mode" in the HUD to intercept normal navigation requests (`will-navigate`) and convert them into new spatial windows to the right of the parent instead of opening inside the same viewport.

## Consequences

*   **Pros**: Highly performant panning/zooming since DOM scaling is offloaded to the GPU via CSS hardware acceleration. Easy maintenance with pure JS dragging/panning physics.
*   **Cons**: `<webview>` runs in its own process and coordinates are in the guest frame, making focus tracking and drag events tricky without custom overlay/event interceptors.
