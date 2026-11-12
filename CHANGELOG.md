# Changelog

All notable changes to this extension are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

Entries up to 0.3.3 were reconstructed from the git history. Their dates are the dates of the version bump commits.

## [Unreleased]

## [0.3.4] - 2026-11-12

### Changed

- New extension icon and a matching single-color side panel icon.
- The package no longer ships build and tooling files (`vite.webviews.config.mts`, `.jscpd*.json`, `components.json`, the icon source).

## [0.3.3] - 2026-11-12

### Changed

- Requires VS Code 1.141.2 or newer.

## [0.3.2] - 2026-11-12

### Changed

- Dependency updates.

## [0.3.1] - 2026-09-02

### Changed

- Internal cleanup: the status bar centralizes its context refresh and command picking.
- Dependency updates.

## [0.3.0] - 2026-08-31

### Changed

- Refreshed side panel components.

## [0.2.0] - 2026-07-31

### Changed

- Dependency and build updates.

## [0.1.1] - 2026-07-16

### Added

- The script list reloads when a `package.json` changes.

## [0.1.0] - 2026-06-17

### Changed

- The side panel is now a webview.
- Status bar scripts were renamed.

### Removed

- Favorite scripts.

## [0.0.4] - 2026-06-15

### Changed

- Maintenance release.

## [0.0.3] - 2026-06-15

### Changed

- Lowered the required VS Code version to 1.110.0.

## [0.0.2] - 2026-06-13

### Added

- Script chain editor: edit a chain from the side panel after you create it.

### Changed

- Relicensed under MIT.

## [0.0.1] - 2026-06-13

### Added

- Run workspace package scripts from a side panel.
- Script chains built from the side panel, with a failure policy: a chain stops at the first failed script.
- Compact status bar mode with one picker, an overflow picker for extra scripts, and suggested chains detected from script names.

[Unreleased]: https://github.com/denizguzel/script-dock/compare/v0.3.4...HEAD
[0.3.4]: https://github.com/denizguzel/script-dock/releases/tag/v0.3.4
