# Developer Guidelines for AI Agents

Welcome to the **Spatial Canvas Web Browser** repository. This document outlines the project structure, design patterns, and instructions for how subsequent development tasks and code updates should be made.

## Architecture Decision Records (ADRs)

To preserve context, requirements, and design history, this project uses **Architecture Decision Records (ADRs)** located in the `devdocs/` directory.

### Guidelines for Modifying Code:
1.  **Read Existing ADRs**: Before modifying or introducing code, read the index in [**`devdocs/README.md`**](devdocs/README.md) and review relevant ADRs. This ensures you understand established conventions (such as how canvas scaling coordinates translate, how webview event loops are structured via `preload.js`, and how window state handles are bounded).
2.  **Document New Decisions**: For any new features, layout enhancements, or major refactorings, you **must** document the change by creating a new ADR.
3.  **Update the Index**: Append any new ADR file to the bulleted list inside [**`devdocs/README.md`**](devdocs/README.md).
4.  **Do Not Run the Application**: AI agents should not execute or run the application process (e.g., via `pnpm start` or direct execution). Running and managing the application process is strictly handled by the user.


---

## ADR Template

Create new records in `devdocs/` using the filename format `adr-NNN-short-description.md` (e.g., `adr-008-custom-context-menu.md`) and paste the following template:

```markdown
# ADR-XXX: Title

*   **Status**: Proposed / Accepted / Superseded
*   **Date**: YYYY-MM-DD

## Context

[Describe the user request, bug, or technical challenge that prompted this change.]

## Decision

[Detail the implementation design. Explain what code files are created/modified, and the technical mechanisms used to address the context.]

## Consequences

*   **Pros**: [Benefits of the chosen implementation path.]
*   **Cons**: [Trade-offs, complexities, or future considerations.]
```

---

## Key Project Design Patterns

*   **CSS Hardware Acceleration**: All panning and zooming operations on the canvas container use CSS transitions and transforms rather than modifying absolute top/left coordinates. Keep coordinates inside `panX` and `panY` and scale delta inputs by dividing by the active `zoom`.
*   **Webview Isolation & Preloading**: Standard webview events do not bubble to the host. Any guest frame events (keyboard hotkeys, specific click behaviors, custom navigation actions) must be listened to inside `preload.js` and forwarded to the renderer via `ipcRenderer.sendToHost()`.
*   **Clean Viewport Animation**: Transitions on the canvas coordinate space are handled dynamically by applying a temporary `.smooth-pan` transition class and stripping it after completion so standard user dragging remains lag-free.
