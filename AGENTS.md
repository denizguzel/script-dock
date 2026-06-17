# Script Dock Agent Rules

## Webview Component Style

- Keep webview React files to one component per file.
- Declare React components with `export function ComponentName(...)`.
- Do not declare React components as `export const ComponentName = ...`.
- Inside React components, define local handlers and local helper callbacks as `const` arrow functions.
- Outside React component scope, define module-level helpers and utilities as `function` declarations instead of `const` arrow functions.
- Keep the Script Dock side panel as a webview-first UI. Do not reintroduce a parallel TreeView for the same script-management surface.
- Prefer concise, VS Code-native controls. Avoid repeating the same script in multiple visible sections unless the active filter explicitly asks for that view.

## Validation

- Use Bun only; do not add npm or Yarn lockfiles.
- After code or manifest changes, run:

```bash
bun run format
bun run lint
bun run build
```

- After manifest, packaging, or marketplace-facing changes, also run:

```bash
bun run package:vsix
```
