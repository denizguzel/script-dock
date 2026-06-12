# Script Dock

VS Code extension for running workspace package scripts from a compact side panel.

## Features

- One-click status bar scripts for package scripts and script chains.
- Compact status bar mode shows one Script Dock picker instead of one item per script.
- Expanded status bar mode can move extra scripts into a single overflow picker.
- Script chain builder from the side panel, without writing JSON by hand.
- Suggested chains can be detected from script names and script bodies such as `format`, `lint`, `knip`, `typecheck`, `test`, and `build`.
- Native VS Code welcome content explains empty workspaces, missing package scripts, and hidden-only script lists.
- Background status bar runs show spinner, success, and failure states without focusing a terminal.
- Background runs can be stopped while they are running.
- Script chains can stop at the first failure or continue through the rest of the chain and report failure at the end.
- Recent background run history with success, failure, exit code, duration, and output tail.
- Status bar scripts show health badges in the side panel.
- Pinned scripts show a warning badge when their package script no longer exists.
- Side panel grouped into favorite scripts and the rest of the visible scripts.
- Multi-package workspaces are grouped by package root.
- Nested Git repositories are ignored by default so opening a parent folder full of separate repos does not flood the panel.
- Search scripts across the workspace from the panel title.
- Context menu actions for adding or removing favorites and status bar scripts.
- Drag status bar scripts in the side panel to reorder them.
- Inline status bar mode toggles let each script run in a terminal or in the background.
- Hide noisy scripts from the panel and restore them from the panel title menu.
- Automatic package manager detection from lockfiles.
- Optional auto-close toggles for one-shot scripts after successful runs.
- Move status bar scripts left or right from the panel title actions.
- Favorites, hidden scripts, auto-close scripts, and status bar scripts created from the UI are stored in VS Code workspace storage, not in `.vscode/settings.json`.

## Settings

The extension ships without project-specific script defaults. You can use the panel context menu to build per-workspace preferences without creating git diffs.

Run `Script Dock: Reset Workspace Preferences` from the command palette or panel title actions to clear UI-created favorites, hidden scripts, auto-close scripts, status bar scripts, alignment, and background run history for the current workspace.

Manual settings are still supported when you want checked-in team defaults:

```json
{
  "scriptDock.favoriteScripts": [],
  "scriptDock.statusBarCommands": [
    {
      "label": "verify",
      "scripts": ["format", "knip", "build"],
      "packagePath": ".",
      "icon": "check-all",
      "executionMode": "background",
      "failurePolicy": "stop"
    },
    { "label": "dev", "script": "dev", "packagePath": ".", "icon": "terminal", "executionMode": "terminal" }
  ],
  "scriptDock.statusBarAlignment": "left",
  "scriptDock.statusBarDisplayMode": "expanded",
  "scriptDock.statusBarOverflowLimit": 6,
  "scriptDock.includeNestedGitRepositories": false,
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
