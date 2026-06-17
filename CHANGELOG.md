# Changelog

All notable changes to Descrollify are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-06-17

### Added
- **Multi-language support** — the entire UI (popup, settings, help page, and in-page toasts) is now localized, with full translations for English, Spanish, German, French, Portuguese (BR), Russian, and Italian.
- **Language selector** in settings — defaults to "Auto (browser language)" and lets you override the language manually.

### Fixed
- The "max videos before blocking" limit can now be set up to 99; the input previously snapped values back down to 30.

## [1.1.0] - 2026-06-16

### Added
- **Configurable redirect** — choose where you land when a Short is blocked ("when blocked, go to" setting).
- **Limit mode now redirects too** — when you hit your video limit it sends you to your chosen destination instead of showing an on-screen blocker.
- Bundled **Roboto Condensed** font across the popup, settings, help page, and the in-page toast, so the UI looks consistent on every OS instead of falling back to the system default.
- `GPLv3` **LICENSE** and an open-source-oriented **README**.

### Changed
- Replaced the full-page DOM overlay blocker with a lighter **pause + toast + redirect** flow.
- Background service worker is now resilient to Manifest V3 worker restarts, using `chrome.alarms` and `storage.session` for timers and state.
- Redesigned the **settings page** into clean label/control rows with toggle switches (replacing the loud cyan buttons) and fixed white-on-white native dropdowns.
- Redesigned the **help / info page** for readability: shorter line length, consistent headings, plainer wording, and calmer styling.
- Tweaked the brand accent color.

### Removed
- Dropped the abandoned "Let me watch" reminder feature and its orphaned backend code.

### Fixed
- Toast and UI text no longer fall back to the default system font on Linux.

[1.2.0]: https://github.com/xtt7even/descrollify-extension/releases/tag/v1.2.0
[1.1.0]: https://github.com/xtt7even/descrollify-extension/releases/tag/v1.1.0
