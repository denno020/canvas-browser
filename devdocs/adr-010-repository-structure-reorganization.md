# ADR-010: Repository Structure Reorganization

*   **Status**: Accepted
*   **Date**: 2026-05-19

## Context

The repository structure of the CanvasBrowser application had all source code files (HTML, CSS, and multiple JavaScript files) scattered directly in the root directory. To adhere to standard software engineering patterns and improve project maintainability, the source files should be organized into a dedicated `src/` directory.

## Decision

We moved all application-specific source files into a new `src/` directory:
- `main.js` -> `src/main.js`
- `preload.js` -> `src/preload.js`
- `renderer.js` -> `src/renderer.js`
- `styles.css` -> `src/styles.css`
- `index.html` -> `src/index.html`

To support this reorganization, we modified:
1. **`package.json`**: Updated the `"main"` entrypoint from `"main.js"` to `"src/main.js"`.
2. **`src/main.js`**: Updated the main process to load `index.html` using `path.join(__dirname, 'index.html')` to ensure it resolves correctly from the new directory structure.
3. **`README.md`**: Updated the File Structure tree diagram to reflect the new layout.

No changes were needed for script/stylesheet inclusions within `src/index.html` or preload path resolution in `src/renderer.js` because their relative positions to each other are preserved within the `src/` folder.

## Consequences

*   **Pros**:
    *   Cleaner root directory containing only configuration files (`package.json`, `.gitignore`, workspace locks, etc.) and documentation files.
    *   Easier navigation and organization of codebase for future enhancements.
    *   Robust path resolution using `__dirname` in `main.js` which prevents directory resolution errors regardless of the directory from which the Electron process is launched.
*   **Cons**:
    *   None.
