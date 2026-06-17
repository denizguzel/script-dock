---
name: script-dock
description: Guide development of the Script Dock VS Code extension. Use when modifying this repository's package-script webview panel, pinned script UX, optional status bar shortcuts, workspace profile storage, background/terminal script execution, VS Code contribution manifest, or Bun/TypeScript/Oxlint/Knip validation flow.
---

# Script Dock

## Purpose

Use this skill to keep changes to `script-dock` consistent with the extension's product shape: a generic VS Code tool for running workspace package scripts from a focused side-panel webview and optional status bar shortcuts.

## Repository Contract

- Work in this repository, even if the checkout directory still has an older local name.
- Use Bun scripts from `package.json`; do not introduce npm/yarn lockfiles.
- Keep package versions pinned when changing dependencies.
- Store user-created UI preferences in `context.workspaceState`, not `.vscode/settings.json`, so ordinary use does not create workspace git diffs.
- Keep the extension generic. Do not ship project-specific default scripts, favorites, status bar commands, or hidden scripts.
- Workspace profile export/import is explicit user action. Validate imported profiles against scripts found in the current workspace and discard or warn about missing script references.

## Architecture Map

- `src/extension.ts`: activation, command registration, refresh wiring.
- `src/config.ts`: settings plus workspace-state-backed preferences.
- `src/scripts.ts`: package.json script discovery and list shaping.
- `src/script-dock-view.ts`: single side-panel webview provider, state shaping, webview message handling, and workspace profile import/export validation.
- `src/status-bar.ts`: status bar rendering, tooltip text, run-state icons.
- `src/status-bar-command.ts`: pinned script helper functions, script list extraction, execution mode default.
- `src/commands.ts`: command handlers and preference mutations.
- `src/terminal.ts`: visible terminal command creation and execution.
- `src/command-runner.ts`: background execution, Output Channel, success/failure/cancel state, and terminal run tracking.
- `src/scripts.ts`: package root discovery is monorepo-aware; script ids use `packagePath#script` outside the root package.
- `src/types.ts`: shared interfaces. Prefer `interface` for object shapes.
- `webviews/launcher/components/*`: one React component per file for the Script Dock panel UI.

## UX Rules

- Favor direct side-panel controls over requiring users to visit VS Code Settings.
- Use familiar VS Code codicons and avoid using the same icon for different meanings in the same row.
- Keep the panel webview as the primary management surface. Do not reintroduce a parallel TreeView for the same script-management UI.
- Keep pinned script execution mode user-controlled:
  - `executionMode: "terminal"` opens a VS Code terminal.
  - `executionMode: "background"` runs through `command-runner.ts`, writes to the `Script Dock` Output Channel, and shows running/success/failed/stopped feedback.
  - Missing `executionMode` defaults to terminal mode. Do not infer background mode from script names such as `build`, `format`, or `dev`.
- Treat auto-close as a terminal lifecycle preference, not as execution mode.
- Background failures should be discoverable: keep the error icon visible, show output, and offer rerun.
- Running scripts should be stoppable from the same place they were started. Use a stop-square affordance while running.
- Keep chain creation available from the side panel, not only manual JSON.
- Keep suggested chain creation generic and based only on common package script names found in the current workspace.
- Keep pinned script ordering manageable from the side panel.
- Offer optional status bar shortcuts. Support compact mode for users who do not want one status bar item per pinned script.
- Keep settings collapsible in the panel so script actions stay primary.
- Surface script health in the side panel with concise state text and familiar codicons.
- Keep background run history concise and stored in workspaceState.
- Avoid duplicate-feeling sections: in the default all view, do not show the same pinned favorite script twice.
- Keep filter counts search-aware.
- Support pinned script bulk actions such as run all and stop all.
- Keep profile import/export discoverable from the panel toolbar, not only from settings or manual files.

## Manifest Rules

- Add every contributed command to `package.json`.
- Prefer command contribution icons over custom SVGs for inline view actions.
- Keep `activationEvents` minimal; VS Code auto-generates activation for contributed commands and views.
- Keep view title and context menus minimal when the action is already represented inside the webview panel.

## Validation

After code or manifest changes, run these in order:

```bash
bun run format
bun run lint
bun run build
```

If validation fails, fix the failure and rerun the relevant command. Do not claim completion without fresh validation output, or state the exact gap if a command could not run.
