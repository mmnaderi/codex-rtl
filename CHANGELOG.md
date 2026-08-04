# Changelog

All notable changes to Codex Smart RTL are documented here.

## [1.6.3] - 2026-08-04

### Changed

- The configured Code Font now also applies to Codex terminal rows, which are rendered outside the conversation scope.

### Validation

- Added a payload smoke test for the terminal Code Font rule.
- `npm test` passes all 48 tests.
- `npm pack --dry-run` produces the publishable v1.6.3 package.

## [1.6.2] - 2026-08-04

### Security

- Hardened Windows shortcut creation by invoking PowerShell directly and passing shortcut paths through child-process environment variables. Paths are no longer interpreted as PowerShell source code.

### Added

- Focused regression tests for Windows paths containing quotes, semicolons, hash characters, and spaces.

### Validation

- `npm test` passes all 47 tests.
- `npm pack --dry-run` includes the Windows shortcut helper in the publishable package.

## [1.6.1] - 2026-08-03

### Fixed

- Fixed a false-positive "Please quit ChatGPT before patching" error on macOS caused by the orphaned `codex app-server` helper process. The running-app check now only matches the main Electron process (`Contents/MacOS/`), not unrelated helper binaries under `Contents/Resources/`.

## [1.6.0] - 2026-08-03

### Added

- Smart, per-script RTL detection that handles mixed Arabic, Persian, Hebrew, and LTR content safely.
- LTR isolation for LaTeX and bare arithmetic, correct RTL table handling, and streaming-safe conversation updates.
- Conversation-only RTL scoping so the sidebar, menus, and app chrome retain their native LTR layout.
- A Windows main-process UI-direction fix for correctly positioned window controls on RTL system locales.
- Source modules, a payload build step, unit tests, and a jsdom end-to-end payload smoke test.
- Arabic README documentation alongside the existing English and Persian guides.

### Changed

- README language sections now appear in English, Persian, then Arabic order.

### Security

- Updated the transitive `brace-expansion` dependency from 5.0.7 to 5.0.9 to address high-severity denial-of-service advisories.

### Validation

- `npm test` passes all 40 tests.
- `npm pack --dry-run` produces the expected publishable package.
