# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Complete Xfwm4 window frame: title segments, edges, corners, and all six buttons in active/inactive/prelight/pressed states plus toggled variants for stick, shade and maximize (60 assets per theme).
- `index.theme` per flavor/variant, installed at the theme root, so themes show a proper name in appearance dialogs.
- WCAG AA contrast test covering every foreground/background pair the GTK2, GTK3, GTK4 and Xfwm4 templates emit, across all 24 combinations.

### Fixed

- Xfwm4 inactive title text used `text.fg_subtle`, which is 4.18:1 on Midnight and 4.16:1 on Dawn — below the 4.5:1 AA floor. It now uses `text.fg_muted`.
- `themerc` emitted `active_shadow_color` and `inactive_shadow_color`, which Xfwm4 does not recognise and silently ignored.
- Inactive window buttons were drawn at 50% opacity, making their contrast unverifiable. All button states now use flat pre-composited token colours.

### Changed

- `npm run check` no longer byte-compares PNGs; it compares a manifest of their SVG sources instead, so a differing librsvg version no longer reports the whole tree as stale.
