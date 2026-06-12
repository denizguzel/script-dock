---
name: script-dock
description: Guide development of the Script Dock VS Code extension. Use when modifying this repository's package-script panel, status bar command UX, workspace preference storage, background/terminal script execution, VS Code contribution manifest, or Bun/TypeScript/Oxlint/Knip validation flow.
---

# Script Dock

## Purpose

Use this skill to keep changes to `script-dock` consistent with the extension's product shape: a generic VS Code tool for running workspace package scripts from a side panel and optional status bar commands.

## Repository Contract

- Work in this repository, even if the checkout directory still has an older local name.
- Use Bun scripts from `package.json`; do not introduce npm/yarn lockfiles.
- Keep package versions pinned when changing dependencies.
- Store user-created UI preferences in `context.workspaceState`, not `.vscode/settings.json`, so ordinary use does not create workspace git diffs.
- Keep the extension generic. Do not ship project-specific default scripts, favorites, status bar commands, or hidden scripts.

## Architecture Map

- `src/extension.ts`: activation, command registration, refresh wiring.
- `src/config.ts`: settings plus workspace-state-backed preferences.
- `src/scripts.ts`: package.json script discovery and list shaping.
- `src/tree.ts`: side panel tree items, context values, inline menu state.
- `src/status-bar.ts`: status bar rendering, tooltip text, run-state icons.
- `src/status-bar-command.ts`: status bar command helpers, script list extraction, execution mode default.
- `src/commands.ts`: command handlers and preference mutations.
- `src/terminal.ts`: visible terminal command creation and execution.
- `src/command-runner.ts`: background execution, Output Channel, spinner/check/error state.
- `src/scripts.ts`: package root discovery is monorepo-aware; script ids use `packagePath#script` outside the root package.
- `src/types.ts`: shared interfaces. Prefer `interface` for object shapes.

## UX Rules

- Favor direct side-panel controls over requiring users to visit VS Code Settings.
- Use familiar VS Code codicons and avoid using the same icon for different meanings in the same row.
- Keep status bar command execution mode user-controlled:
  - `executionMode: "terminal"` opens a VS Code terminal.
  - `executionMode: "background"` runs through `command-runner.ts`, writes to the `Script Dock` Output Channel, and shows running/success/failed status bar feedback.
  - Missing `executionMode` defaults to terminal mode. Do not infer background mode from script names such as `build`, `format`, or `dev`.
- Treat auto-close as a terminal lifecycle preference, not as execution mode.
- Background failures should be discoverable: keep the error icon visible, show output, and offer rerun.
- Keep chain creation available from the side panel, not only manual JSON.
- Keep status bar command ordering manageable from the side panel; prefer drag and drop over separate reorder commands.
- Keep background run history concise and stored in workspaceState.

## Manifest Rules

- Add every contributed command to `package.json`.
- Prefer command contribution icons over custom SVGs for inline view actions.
- Keep `activationEvents` minimal; VS Code auto-generates activation for contributed commands and views.
- When adding inline tree actions, drive visibility from `TreeItem.contextValue` tokens in `src/tree.ts`.

## Validation

After code or manifest changes, run these in order:

```bash
bun run format
bun run lint
bun run build
```

If validation fails, fix the failure and rerun the relevant command. Do not claim completion without fresh validation output, or state the exact gap if a command could not run.
