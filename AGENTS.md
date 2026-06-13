# Script Dock Agent Rules

## Webview Component Style

- Keep webview React files to one component per file.
- Declare React components with `export function ComponentName(...)`.
- Do not declare React components as `export const ComponentName = ...`.
- Inside React components, define local handlers and local helper callbacks as `const` arrow functions.
- Outside React component scope, define module-level helpers and utilities as `function` declarations instead of `const` arrow functions.

## Validation

- Use Bun only; do not add npm or Yarn lockfiles.
- After code or manifest changes, run:

```bash
bun run format
bun run lint
bun run build
```
