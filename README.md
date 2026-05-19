# Infinite Canvas Browser Prototype

A modern, fluid prototype of an infinite canvas web browser built with Electron, HTML, CSS, and Vanilla JavaScript. 

It organizes web pages into modular, draggable, and resizable window panels on a zoomable canvas, with automatic tracing of browsing parent-child relationships using cubic Bezier connectors.

---

## Features

1. **Infinite Canvas Viewport**:
   - Gorgeous dark-themed grid backdrop.
   - Smooth panning: Hold `Space` + click & drag, or hold **Middle Mouse Button** and drag.
   - Smooth zooming: Scroll your mouse wheel or trackpad to scale from `15%` to `300%`. Zoom automatically tracks the cursor.
   - **Smart Canvas Scrolling**: Automatically fit and center individual windows or all active windows perfectly in the viewport.

2. **Draggable & Resizable Browser Windows**:
   - Modern glassmorphic panel frames with smooth shadow translations when active or dragging.
   - Navigation controls (Back, Forward, Refresh), current page title, interactive URL bar.
   - Multi-directional resizing with standard edge handles, plus preset sizes via the title bar dropdown (e.g., Mobile Portrait, Standard Square).
   - Smooth rendering of websites using Electron's native `<webview>` tag.

3. **Tab Connections & Spawn Logic**:
   - **Click Spawning Mode**: Toggle between:
     - `Spawn New Node`: Standard/internal website link clicks block the current page and open in a brand new child window horizontally positioned cleanly to the right of the parent.
     - `Navigate Same Page`: Link clicks navigate within the current panel.
   - Intercepts and blocks default external window actions (like links targeted with `_blank`), auto-generating new window nodes.
   - Visual cubic Bezier connections with glowing linear gradients connecting parent windows to their child nodes, tracing the user's browsing journey.

4. **Window Branch Management**:
   - Custom right-click Context Menu to easily manage complex tab trees.
   - **Close Branch**: Closes a parent window and cascades to close all of its descendants.
   - **Close Children**: Closes all descendant nodes while keeping the parent open.

---

## How to Run

1. Make sure you have **Node.js** (v24+) installed.
2. In your terminal, navigate to the project directory:
3. Install the dependencies:
   ```bash
   pnpm install
   ```
4. Start the application:
   ```bash
   pnpm start
   ```

---

## HUD Controls Guide

- **Zoom Level**: Displays current canvas scale.
- **Window Count**: Displays active window panels.
- **Fits All**: Automatically adjusts the zoom level and pans the viewport to fit all active windows within a single viewport.
- **Click Action Mode**: Choose whether link clicks navigate inside the same window or spawn new child windows!
