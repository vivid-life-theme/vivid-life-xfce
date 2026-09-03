# Xfwm4 completion — design

Date: 2026-09-03
Status: approved for planning
Supersedes the Xfwm4 portions of `2026-08-30-xfce-theme-port-design.md`; everything else in that spec stands.

## Purpose

Close the gaps left by the initial Xfce port. The Xfwm4 target currently ships a `themerc` plus six button PNGs and does not produce a working window frame, and the README documents this as a known limitation. This design completes the Xfwm4 asset set, fixes an accessibility bug and two invalid `themerc` keys found while surveying the format, adds a per-theme `index.theme`, and replaces a drift check that cannot survive a librsvg version change.

## Context: what exists today

Generated output per flavor × variant (24 combinations):

- `gtk-2.0/vivid-life-<f>-<v>/gtkrc` — complete
- `gtk-3.0/vivid-life-<f>-<v>/gtk.css` — complete
- `gtk-4.0/vivid-life-<f>-<v>/gtk.css` — complete (best-effort; libadwaita limitation documented)
- `xfwm4/vivid-life-<f>-<v>/{themerc, close|hide|maximize-{active,inactive}.png}` — **incomplete**

Defects found while surveying the 48 Xfwm4 themes installed under `/usr/share/themes`:

1. **Missing frame assets.** No title segments, no corners, no edges, three of six button kinds absent (`menu`, `stick`, `shade`), and two of four button states absent (`prelight`, `pressed`) along with every `*-toggled-*` variant. Xfwm4 cannot render a frame from what is committed.
2. **Two invalid `themerc` keys.** `active_shadow_color` and `inactive_shadow_color` are not part of the Xfwm4 vocabulary; the real keys are `active_text_shadow_color` and `inactive_text_shadow_color` (confirmed across 42 installed themes that set them). Both current keys are silently ignored.
3. **An accessibility bug.** `inactive_text_color` is set to `text.fg_subtle`. Against `surface.bg_sunk` that is 4.18:1 on Midnight and 4.16:1 on Dawn — below the 4.5:1 WCAG AA floor this project requires for all 24 combinations.
4. **An unverifiable inactive button state.** `renderButtonSvg` renders inactive buttons at `opacity: 0.5`. The resulting colour depends on whatever is composited beneath, so its contrast cannot be computed or asserted.
5. **A drift check that will produce false positives.** `checkDrift` byte-compares PNG output. librsvg does not emit byte-identical PNGs across versions, so any maintainer on a different distribution sees the entire tree reported as stale.
6. **No `index.theme`.** Installed themes have no display name or description in the Xfce appearance dialog.

## Non-goals

- No change to the GTK2, GTK3, or GTK4 stylesheets. A pair-by-pair audit of all three templates across all 24 combinations found no AA violations; the worst non-exempt pairs are `fg_muted` on `bg_soft` at 5.27:1 (GTK3, Twilight) and `fg` on `border.default` at 6.42:1 (GTK2 button prelight and GTK4 `button:hover`, Twilight). The GTK templates are in scope for the contrast test, not for edits.
- No icon or font assets, per the parent spec.
- No `--system` install mode, no CI wiring, no automated screenshot diffing.
- No HiDPI asset variants. Xfwm4 themes at 2× are a separate concern (see Future work).

## Decisions and their derivation

Every visual decision below is derived from the design system rather than invented. The reference is `preview/01-kitchen-sink.html` in `vivid-life-design-system`, whose sticky top bar (`.ks-bar`) is the design system's own window chrome.

| Decision               | Value                                                                 | Derived from                                                                                                                                  |
| ---------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Titlebar fill          | `surface.bg_sunk`                                                     | `.ks-bar { background: var(--vl-bg-sunk) }`                                                                                                   |
| Titlebar bottom border | 1px `border.default`                                                  | `.ks-bar { border-bottom: 1px solid var(--vl-border) }`                                                                                       |
| Titlebar height        | 32px                                                                  | 24px button (`spacing.6`) + `spacing.1` above and below                                                                                       |
| Corner radius          | 8px, top corners only                                                 | `radii.md`, the radius of `.btn` and the kitchen-sink cards                                                                                   |
| Button behaviour       | transparent → `state.hover` → `state.active`; glyph `fg_muted` → `fg` | `.btn-ghost` and its `:hover` / `:active` rules                                                                                               |
| Button backing shape   | 8px rounded square                                                    | `.btn { border-radius: 8px }`                                                                                                                 |
| Focus signal           | 2px `accent` edge under the active titlebar                           | Accent means "selected / primary" (`.ks-pill[aria-pressed="true"]`, `.btn-primary`); the focused window is exactly that                       |
| Inactive title text    | `text.fg_muted`                                                       | `.btn-*:disabled` dims the foreground and keeps the background; `fg_muted` is the darkest foreground token that clears AA on all four flavors |
| Glyph language         | Lucide, 16px glyph box, 1.5px stroke                                  | `iconography.inline_ui.primary` names Lucide; `assets/glyphs/` already vendors `menu`, `minus`, `x`, `chevron-down`                           |

Two decisions are conventions rather than derivations, recorded here so they are visible:

- **Button asset canvas is the full titlebar height, not the button height.** Eight of ten surveyed themes size button images to the title image height (Greybird 20×24 in a 24px bar; Ant, Dracula, Sweet 28×32 in a 32px bar). Our button assets are therefore 24×32 with the 24×24 ghost square centred vertically.
- **`show_app_icon=false`.** The frame ships a Lucide `menu` glyph for the window-menu button; letting Xfwm4 substitute the application's icon from the user's icon theme would put a coloured raster glyph in an otherwise flat monochrome frame. Reversible in one line if it proves unpopular.

## Frame specification

Coordinates below are in device pixels at 1×.

**Titlebar** — 32px tall, filled `surface.bg_sunk`. The bottom 2px carry the focus edge: `accent` on `-active`, `-prelight` and `-pressed` assets; `border.subtle` on `-inactive` assets. Title text is `text.fg` when focused and `text.fg_muted` when not, left-aligned, offset 12px (`spacing.3`) from the frame edge.

**Corners** — top-left and top-right are 8×32, with an 8px radius carved out of the top outer corner (transparent outside the curve) and `surface.bg_sunk` elsewhere, plus the 2px focus edge at the bottom.

**Edges** — left, right and bottom are 1×1 solid `border.default`.

**Bottom corners** — 16×16 with alpha: a 1px `border.default` run along the two outer edges, transparent elsewhere. They look identical to a 1px border but are deliberately not 1×1, because Xfwm4 derives the corner-resize grab region from the corner asset's dimensions — a 1×1 bottom corner yields a 1px diagonal-resize target, which is the standing usability complaint about Greybird (1×1) versus Daloa (16×16). 16px matches Daloa and `spacing.4`. Confirming that the grab region follows the asset size is an item in the manual verification checklist.

**Buttons** — 24×32 canvas, opaque, filled `surface.bg_sunk` with the 2px focus edge at the bottom. Centred within it is a 24×24 cell containing the ghost backing and glyph:

| Asset state                  | Backing                                                | Glyph           |
| ---------------------------- | ------------------------------------------------------ | --------------- |
| `-active` (focused, at rest) | none (bare `bg_sunk`)                                  | `text.fg_muted` |
| `-prelight` (hover)          | 8px rounded square, `composite(bg_sunk, state.hover)`  | `text.fg`       |
| `-pressed`                   | 8px rounded square, `composite(bg_sunk, state.active)` | `text.fg`       |
| `-inactive` (unfocused)      | none                                                   | `text.fg_muted` |

`composite()` flattens the design system's `#RRGGBBAA` state overlays against the known titlebar colour, producing an opaque hex. No asset uses partial opacity, so every foreground/background pair in the frame is a concrete colour pair that the contrast test can assert.

Button assets are opaque rather than alpha-masked so they render correctly regardless of what Xfwm4 paints in the button slot. `button_offset` and `button_spacing` gaps expose the adjacent title segments, which are the same `bg_sunk`, so the bar reads as continuous.

**Glyph rendering** — Lucide glyphs are authored on a 24×24 grid at `stroke-width: 2`. They are scaled to the 16px glyph box (factor 0.6667) and centred in the 24×24 cell; `stroke-width` is set to 2.25 pre-scale so the stroke rasterises at 1.5px. Caps and joins stay `round`, per Lucide.

## Asset inventory

60 assets per theme directory — 61 files including `themerc` — and 1440 assets in total.

| Group           | Files                                                                       | Count | Dimensions | Format |
| --------------- | --------------------------------------------------------------------------- | ----- | ---------- | ------ |
| Title segments  | `title-{1,2,3,4,5}-{active,inactive}`                                       | 10    | 2×32       | XPM    |
| Edges           | `{left,right,bottom}-{active,inactive}`                                     | 6     | 1×1        | XPM    |
| Top corners     | `top-{left,right}-{active,inactive}`                                        | 4     | 8×32       | PNG    |
| Bottom corners  | `bottom-{left,right}-{active,inactive}`                                     | 4     | 16×16      | PNG    |
| Buttons         | `{menu,stick,shade,hide,maximize,close}-{active,inactive,prelight,pressed}` | 24    | 24×32      | PNG    |
| Toggled buttons | `{stick,shade,maximize}-toggled-{active,inactive,prelight,pressed}`         | 12    | 24×32      | PNG    |

XPM is chosen for every solid-colour asset because it is a plain-text format — the idiom real themes already use (Greybird's `left-active.xpm` is 78 bytes of text). Text assets byte-compare reliably, diff readably, and are unaffected by rasteriser versions. Only the anti-aliased assets (44 per theme, ~560 KB across the repo) are PNG.

### Glyph mapping

| Button             | Lucide glyph   | Status upstream |
| ------------------ | -------------- | --------------- |
| `menu`             | `menu`         | present         |
| `hide`             | `minus`        | present         |
| `close`            | `x`            | present         |
| `shade-toggled`    | `chevron-down` | present         |
| `shade`            | `chevron-up`   | **to add**      |
| `maximize`         | `square`       | **to add**      |
| `maximize-toggled` | `copy`         | **to add**      |
| `stick`            | `pin`          | **to add**      |
| `stick-toggled`    | `pin-off`      | **to add**      |

Glyph path data is read at generate time from `@vivid-life-theme/design-system/assets/glyphs/<name>.svg`. The package's `exports` map already publishes `"./assets/*": "./assets/*"`, and `assets/glyphs/` is present in the published tarball, so no vendoring and no second art dependency is required. Per this project's "never hand-encode what upstream owns" rule, no glyph path is ever inlined in this repo.

**Upstream prerequisite.** Five glyphs (`chevron-up`, `square`, `copy`, `pin`, `pin-off`) must be added to `vivid-life-design-system`'s `assets/glyphs/` and released before generation can run here. The implementation plan's first task belongs to that repo; the second is bumping the pinned version in this one. Nothing else in this design is blocked by it — the `themerc` fix, `index.theme`, the contrast test and the drift-check rework can all land first.

## `themerc`

Generated per combination. Values that resolve from tokens are named; literals are geometry.

```
active_text_color=<text.fg>
inactive_text_color=<text.fg_muted>
title_shadow_active=false
title_shadow_inactive=false
title_alignment=left
title_horizontal_offset=12
title_vertical_offset_active=0
title_vertical_offset_inactive=0
full_width_title=true
button_offset=4
button_spacing=2
maximized_offset=0
show_app_icon=false
show_frame_shadow=true
show_popup_shadow=true
shadow_delta_x=0
shadow_delta_y=-12
shadow_delta_width=0
shadow_delta_height=2
shadow_opacity=18
```

Changes from the current file: `inactive_text_color` moves from `fg_subtle` to `fg_muted` (the AA fix); the two invalid `*_shadow_color` keys are removed rather than renamed, because `title_shadow_*` is `false` and shadow colours are only consulted when title shadows are on — the design system has no text-shadow concept; `show_app_icon` flips to `false`; and the geometry and drop-shadow keys are added.

Drop-shadow values are mapped from `shadows.lg` (`0 12px 32px rgba(0,0,0,0.18)`): the 12px y-offset becomes `shadow_delta_y`, and the 0.18 alpha becomes `shadow_opacity=18`. Xfwm4's sign convention for `shadow_delta_y` is not documented; confirming that the shadow falls below the window is an acceptance criterion of the manual verification step, not an open question.

## Generator changes

**`tools/lib/paths.mjs`** — add `INDEX_TARGET = "index"` and export `OUTPUT_DIRS = [...TARGETS, INDEX_TARGET]`. `TARGETS` keeps its current four-element value so the installer's target vocabulary is unchanged.

**`tools/lib/glyphs.mjs`** (new) — `loadGlyph(name)` resolves `@vivid-life-theme/design-system/assets/glyphs/<name>.svg`, extracts the drawable children of the root `<svg>`, and returns them as a string. Throws with the glyph name if the file is absent, so a missing upstream glyph fails loudly at generate time rather than producing an empty button.

**`tools/templates/xfwm4.mjs`** — `renderThemerc` gains the keys above. `renderButtonSvg({ kind, state })` replaces the current `{ kind, active, backgroundHex, glyphHex }` signature and loses the `opacity` parameter entirely; it resolves its own colours from the flavor block and the state table. New exports: `BUTTON_MATRIX` (the 36 `{ kind, state }` pairs), `renderCornerSvg({ side, active })`, `renderTitleXpm({ segment, active })`, and `renderEdgeXpm({ edge, active })`.

**`tools/lib/xpm.mjs`** (new) — `renderXpm(pixels, colors)` emits a valid XPM 3 file from a small colour-indexed grid. Deterministic by construction.

**`tools/templates/index-theme.mjs`** (new) — `renderIndexTheme(flavor, variant)` emits the `[Desktop Entry]` and `[X-GNOME-Metatheme]` sections naming the theme and pointing `GtkTheme`, `MetacityTheme` and `IconTheme` at the right values.

**`tools/generate.mjs`** — writes the 60 Xfwm4 assets per combination and the `index/` output, and records the asset manifest described below.

`renderAll` must also make PNG writing **idempotent across rasteriser versions**. Moving the drift check onto SVG hashes fixes `npm run check`, but not `git diff`: a bare `renderAll` re-rasterises unconditionally, so a maintainer whose librsvg differs would rewrite all ~960 PNGs with different bytes and identical meaning — and the README's regeneration workflow ends in `git add -A && git commit`. So a PNG is rewritten only when it is missing, fails its signature check, or its manifest hash has changed; otherwise it is left alone. This makes generator output a function of the tokens rather than of the machine, which is the property the manifest is meant to buy. A `--force-raster` flag re-rasterises everything unconditionally, for the case where the rasteriser output itself needs refreshing.

## Drift check

`checkDrift` splits by asset class:

- **Text output** (`themerc`, `*.xpm`, `gtkrc`, `gtk.css`, `index.theme`) — byte-compared exactly as today.
- **PNG output** — not byte-compared. The generator writes `xfwm4/assets.manifest`, a sorted text file of `<sha256 of the SVG source>  <relative png path>` lines. `--check` regenerates the SVG sources, recomputes the manifest and byte-compares it, then asserts that every path it names exists on disk and begins with the 8-byte PNG signature.

This makes the SVG source the thing under version control's scrutiny, which is what actually derives from the tokens; the PNG is build output. A token change alters the SVG and moves the hash, so real drift is caught. A librsvg upgrade changes neither, so the false-positive mode disappears. The cost is that a corrupted or truncated PNG is caught only by the signature check, not bit-for-bit — an acceptable trade for output that is regenerated by a single command.

`assets.manifest` is committed.

## `index.theme`

Generated to `index/vivid-life-<flavor>-<variant>/index.theme`. `index/` is a fifth **output directory** — the generator's file walker and drift check iterate `OUTPUT_DIRS`, so it is covered like any other generated file — but it is not a fifth **installable target**: `TARGETS` stays four elements, so `--targets` keeps its current vocabulary and `index.theme` is never something a user selects. Unlike the four targets it installs to the theme _root_ (`~/.themes/vivid-life-<f>-<v>/index.theme`) rather than into a subdirectory, so the installer copies it with its own line rather than through the per-target loop.

`install.sh` copies it whenever it installs any target for a combination. The `[X-GNOME-Metatheme]` keys always name all four targets regardless of which were installed; naming a target the user did not install is inert.

## Contrast test

`tools/lib/contrast.mjs` exports `contrastRatio(hexA, hexB)` and `composite(baseHex, overlayHex)` — the latter flattening `#RRGGBBAA` overlays against an opaque base, which is what makes the ghost button states assertable.

`tools/lib/contrast.test.mjs` iterates `allCombinations()` and asserts ≥ 4.5:1 for every foreground/background pair the four templates emit, including:

- Xfwm4: title text (`fg` on `bg_sunk`, `fg_muted` on `bg_sunk`), and each button state's glyph against its own backing.
- GTK2/3/4: `fg` on `bg` / `bg_soft` / `bg_sunk` / `bg_overlay` / `border.default`, `fg_muted` on `bg_soft`, `accent_on` on `accent` (all 24), `accent_on` on `semantic.danger`.

GTK3's `button:hover` uses `shade(@vl_bg_soft, 1.08)` rather than a token. The test models GTK's `shade()` as a multiply on HSL lightness with clamping, which is what GTK implements; the pair resolves to 6.42:1 at worst (Twilight). GTK4 expresses the same hover state as `@vl_border` and GTK2 as `bg[PRELIGHT] = border.default`. The inconsistency between the three templates is pre-existing and out of scope here, but the test asserts all three forms.

One documented exemption: pairs involving `text.fg_disabled`. WCAG 1.4.3 excludes text that is part of an inactive user-interface component, and the design system's own disabled treatment relies on that. The exemption is a named list in the test, not a blanket skip, so a new disabled pair has to be added deliberately.

The audit that informed this section covered all three GTK templates pair by pair and found them already compliant, so the test is expected to pass on its first run against everything except the Xfwm4 `inactive_text_color` value this design changes. No GTK stylesheet edits are needed to make it pass.

## Installer changes

`install.sh` copies `index/<theme>/index.theme` to the theme root alongside the target directories. Its target detection, flags, prompts and post-install text are unchanged. `shellcheck install.sh` remains the automated gate.

## Documentation changes

- Delete the README's "Known limitation: Xfwm4 is partial" section — this work removes the limitation it describes.
- Add a short note that rounded top corners require a running compositor; without one, Xfwm4 has no alpha and the corners render as opaque wedges. Xfce 4.18 enables its compositor by default, so this is an edge case worth stating rather than designing around.
- Extend the maintainer regeneration section with the upstream-glyph dependency and the meaning of `assets.manifest`.
- Update the repository-layout block with `index/`.

## Testing

- `node --test` over `tools/` — unit tests for the new XPM writer, glyph loader, button matrix, corner and title renderers, `index.theme` renderer, and the contrast assertions.
- `npm run check` — drift, under the split scheme above.
- `shellcheck install.sh`.
- Manual verification, per the parent spec: install a combination, select it in **Settings → Window Manager**, and confirm the frame renders, the focus edge appears and disappears with focus, hover and press states respond on all six buttons, `stick`/`shade`/`maximize` toggle to their alternate glyphs, the drop shadow falls below the window, and dragging a bottom corner starts a diagonal resize across roughly 16px rather than a 1px sliver — the last of these confirms that Xfwm4 derives the grab region from the corner asset's dimensions.

## Future work

- HiDPI (`@2x`) asset variants. Xfwm4 has no automatic scaling for theme assets; a `-hdpi` theme suffix in the manner of `Default-hdpi` would be the conventional approach.
- Wiring `npm run check` into a CI job, carried over from the parent spec's open questions.
- A `--system` install mode, also carried over.
