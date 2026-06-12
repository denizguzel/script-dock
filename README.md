# Script Dock

VS Code extension for running workspace package scripts from a compact side panel.

## Features

- One-click status bar commands for package scripts and script chains.
- Background status bar runs show spinner, success, and failure states without focusing a terminal.
- Side panel grouped into favorite scripts and the rest of the visible scripts.
- Context menu actions for adding or removing favorites and status bar commands.
- Inline status bar mode toggles let each command run in a terminal or in the background.
- Hide noisy scripts from the panel and restore them from the panel title menu.
- Automatic package manager detection from lockfiles.
- Optional auto-close toggles for one-shot scripts after successful runs.
- Move status bar commands left or right from the panel title actions.
- Favorites, hidden scripts, auto-close scripts, and status bar commands created from the UI are stored in VS Code workspace storage, not in `.vscode/settings.json`.

## Settings

The extension ships without project-specific script defaults. You can use the panel context menu to build per-workspace preferences without creating git diffs.

Manual settings are still supported when you want checked-in team defaults:

```json
{
  "scriptDock.favoriteScripts": [],
  "scriptDock.statusBarCommands": [
    { "label": "verify", "scripts": ["format", "knip", "build"], "icon": "check-all", "executionMode": "background" },
    { "label": "dev", "script": "dev", "icon": "terminal", "executionMode": "terminal" }
  ],
  "scriptDock.statusBarAlignment": "left",
  "scriptDock.statusBarPriority": 10000,
  "scriptDock.statusBarPriorityStep": 10,
  "scriptDock.hideScripts": [],
  "scriptDock.autoCloseScripts": []
}
```

## Development

```bash
bun install
bun run build
```

Open this folder in VS Code and run the `Run Extension` debug configuration. The launch config opens `/home/denizguzel/development/Frontend/bstp-csr` as the test workspace.
