# Changelog

All notable changes to Codex Smart RTL are documented here.

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
