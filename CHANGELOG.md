# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Complete Xfwm4 window frame: title segments, edges, corners, and all six buttons in active/inactive/prelight/pressed states plus toggled variants for stick, shade and maximize (60 assets per theme).
- `index.theme` per flavor/variant, installed at the theme root, so themes show a proper name in appearance dialogs.
- WCAG AA contrast test covering the foreground/background pairs the GTK2, GTK3, GTK4 and Xfwm4 templates emit, across all 24 combinations, gated at 1.4.3's 4.5:1 for text.
- WCAG 1.4.11 (non-text UI, 3:1) test covering the GTK3/GTK4 scrollbar slider against its track, across all four flavors.

### Fixed

- Xfwm4 inactive title text used `text.fg_subtle`, which is 4.18:1 on Midnight and 4.16:1 on Dawn — below the 4.5:1 AA floor. It now uses `text.fg_muted`.
- `themerc` emitted `active_shadow_color` and `inactive_shadow_color`, which Xfwm4 does not recognise and silently ignored.
- Inactive window buttons were drawn at 50% opacity, making their contrast unverifiable. All button states now use flat pre-composited token colours.
- GTK3 painted `selection, *:selected` with `alpha(@vl_accent, 0.35)`. Because `*:selected` is a universal selector, that composited over whichever surface an ancestor happened to paint, and on Twilight it fell to 3.93–4.25:1 over `bg_soft`/`bg_overlay`. It now uses the design system's opaque `state.selection` token, so selection contrast is determinate: 12.30 (Midnight), 6.23 (Twilight), 9.54 (Dawn), 14.23 (Noon).
- GTK3/GTK4 scrollbar slider used `border.strong` over `surface.bg`, which was 1.909:1 on Twilight — below WCAG 1.4.11's 3:1 floor for non-text UI. It now uses `text.fg_subtle`, which clears 3:1 on all four flavors (3.78 Midnight, 4.11 Twilight, 5.27 Dawn, 7.17 Noon).

### Changed

- `npm run check` no longer byte-compares PNGs; it compares a manifest of their SVG sources instead, so a differing librsvg version no longer reports the whole tree as stale.
- `tools/generate.mjs` rasterises each distinct SVG source once per `renderAll` call and copies the bytes for the ~29% of manifest entries that repeat one, instead of re-invoking `rsvg-convert` for every asset. Measured: a full `renderAll` pass dropped from ~24.7s to ~14.1s.
- `tools/generate.test.mjs` shares one generated tree across the five tests that only ever inspect it, instead of each building its own, cutting four full `renderAll` passes from the suite.
