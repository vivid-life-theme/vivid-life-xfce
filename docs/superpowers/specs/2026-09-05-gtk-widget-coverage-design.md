# Vivid Life Xfce — GTK widget coverage design

Date: 2026-09-05
Status: approved for planning

## Purpose

Bring the GTK2/GTK3/GTK4 stylesheets from partial to comprehensive widget coverage, and put a verification harness and a contrast gate behind them so coverage gaps and token-pairing mistakes are caught by the build rather than by a user opening an app.

## Problem

The GTK3 template covers roughly eighteen selectors in a single 200-line function. Widgets it never mentions are drawn by GTK with no theme input at all, so they render as unstyled fragments beside fully themed neighbours in the same window. Three user reports in one session all reduced to this:

1. **Whisker Menu is two-tone.** Measured from a screenshot: the left app pane is `#171717` (`surface.bg`) and the right category pane is `#404040` (`surface.bg_overlay`). The `menu, .menu` rule paints the popup-menu surface onto menu-classed containers only, so sibling panes of the same popup fall through to the window background.

2. **Buttons have no discernible boundary.** `border.default` fails WCAG 1.4.11 (3:1) against every surface on every flavor, and is _identical_ to the surface in three cases (1.00:1) — including `bg_soft` on Midnight, where every button lives. The fill cannot carry the boundary either:

   | flavor   | control fill | canvas    | ratio  |
   | -------- | ------------ | --------- | ------ |
   | Midnight | `#404040`    | `#171717` | 1.73:1 |
   | Twilight | `#525252`    | `#404040` | 1.33:1 |
   | Dawn     | `#f5f5f5`    | `#d4d4d4` | 1.36:1 |
   | Noon     | `#ffffff`    | `#f5f5f5` | 1.09:1 |

3. **`switch` renders as a bare tick and circle**, because the template has no `switch` rules whatsoever.

The existing `aa.test.mjs` did not catch any of these: it asserts about twenty hardcoded text pairs and exactly one non-text pair (the scrollbar slider). Nothing gates borders, and nothing notices a widget that has no rules at all.

Nodes Xfce renders regularly with zero rules today: `menubar`, `toolbar`, `popover`, `combobox`, `switch`, `spinbutton`, `scale`, `separator`, `treeview` and its column headers, `list`/`row`, `paned`, `infobar`, `expander`, `frame`, `levelbar`, `calendar`, `.linked`, `.sidebar`.

## Non-goals

- No pixel-diffing visual regression in CI. The harness renders images for human review; it does not assert on them. (This narrows, but does not overturn, the 2026-08-30 spec's "verification is manual" non-goal.)
- No parity with a full theme's line count as a target in itself. Coverage is defined by widgets that render, not by lines written.
- No vendoring or transliteration of another theme's stylesheet. Licensing aside, the port must express the Vivid Life design language, not another theme's.
- No redefinition of upstream token _values_ in this port. Where the foundation lacks a token, the port derives one from existing tokens by a documented, deterministic rule and references the upstream issue.

## Source of truth

Unchanged from the 2026-08-30 spec: tokens come from the pinned `@vivid-life-theme/design-system` package and are never re-derived. For visual decisions the tokens alone do not answer, the reference is the design system's `preview/01-kitchen-sink.html` — its component states define the hover/press/selected language. Screenshots under `assets/screenshots/` are stale and are not a reference.

## Architecture

### Template modules

Each target's template becomes an index that composes per-widget modules in a defined cascade order:

```text
tools/templates/
  gtk3.mjs                  index: composes modules, defines cascade order
  gtk3/
    _tokens.mjs             the @define-color block
    base.mjs                window, .background, label, separator, misc resets
    button.mjs              button, .linked, .flat, suggested/destructive
    entry.mjs               entry, searchbar
    spinbutton.mjs
    check-radio.mjs
    switch.mjs
    scale.mjs
    progress.mjs            progressbar, levelbar, spinner
    menu.mjs                menu, menubar, menuitem, popover
    notebook.mjs
    header-bars.mjs         headerbar, toolbar, actionbar, pathbar
    view.mjs                treeview, iconview, textview, list, row, column headers
    sidebar.mjs
    paned.mjs
    scrollbar.mjs
    tooltip.mjs
    infobar.mjs             infobar, .warning/.error/.success
    dialog.mjs              dialog, messagedialog, decoration/csd
    selection.mjs           selection node, *:selected
    misc.mjs                calendar, expander, frame, separator edge cases
  gtk4/  ... same shape, subset that GTK4 honours
  gtk2/  ... gtkrc syntax; fewer modules, same composition idea
```

Each module exports two functions:

```js
export function render(ctx) {
  /* returns a CSS fragment string */
}
export function contrastPairs(ctx) {
  /* returns the pairs this module emits */
}
```

`ctx` carries `{ surface, text, border, semantic, state, accent, accentOn, control }`, where `control` holds the derived control-boundary values described below.

Cascade order is explicit in the index and is part of the contract: `base` first, `selection` last, so the selection rules win over per-widget colours without relying on selector specificity. This matters because `*:selected` uses the universal selector, which contributes zero specificity and therefore loses to any element or class selector regardless of source order — selection rules must be both last _and_ written with sufficient specificity for the widgets they target.

### Preview harness

`tools/preview/gallery.py` — GTK3 via GObject introspection (`gi`). No new project dependencies.

The interpreter must be **`/usr/bin/python3` explicitly, not `python3` from `PATH`**. On this machine `PATH` resolves `python3` to the Homebrew build, which has no `gi` module; only the distribution interpreter carries the GTK bindings. The npm scripts and the script's shebang must both hardcode `/usr/bin/python3`, and the script must fail with a clear message — not a bare `ModuleNotFoundError` — if `gi` is missing. It renders one scrollable window containing every widget in every state it supports, grouped into sections mirroring `01-kitchen-sink.html` (surfaces, text layers, buttons, inputs, tabs, lists, menus, feedback), plus an Xfce section that reproduces the multi-pane popup layout that produced defect 1.

npm scripts:

- `npm run preview -- --theme <name>` — opens the gallery on the current display for interactive inspection.
- `npm run preview:shots` — for each of the 24 themes, runs the gallery under `xvfb-run` with `GTK_THEME=<name>`, captures a PNG, then montages one contact sheet per flavor.
- `npm run preview:factory` — the same capture loop wrapped around `gtk3-widget-factory`, used as the upstream completeness checklist rather than as our own gallery.

Screenshots are written to `tools/preview/out/`, which is gitignored. They are regenerated on demand and never committed.

`gtk3-widget-factory` (from `gtk-3-examples`) and the GTK4 bindings (`gir1.2-gtk-4.0`, `gtk-4-examples`) are optional. Every script must detect their absence, skip that step with a clear message, and still succeed — a fresh clone must not require them.

### Contrast gate

`aa.test.mjs` stops hardcoding pairs. Instead it walks every template module's `contrastPairs(ctx)` across all 24 flavor/variant combinations and asserts:

- `rule: "text"` → 4.5:1 (WCAG 1.4.3)
- `rule: "nontext"` → 3:1 (WCAG 1.4.11)

Exemptions are explicit entries carrying their justification, e.g. `{ exempt: "WCAG 1.4.3 — inactive UI component" }`, so they are recorded rather than silently skipped. This extends the pattern the file already uses for `text.fg_disabled`, including its assertion that the exemption still _needs_ to exist.

A second test asserts that every module in the directory is imported by its index, so adding a module file without wiring it in fails rather than silently doing nothing.

### The control-boundary value

Pending upstream issue #15, `control.border` is derived per flavor at build time as **the first of `[border.strong, text.fg_subtle, text.fg_muted]` that clears 3:1 against the surface the control sits on**. Properties:

- Uses only existing upstream tokens; invents no hex values.
- Deterministic and reproducible from tokens alone.
- Gated by the contrast test, so it cannot silently regress.
- Self-healing: when the foundation adds a real control-boundary token, the derivation is replaced by a direct token read and the emitted CSS should barely move.

The derivation lives in `tools/lib/tokens.mjs` beside the existing `resolveAccent`/`accentOn` helpers, with a comment referencing upstream issue #15.

Separately, adjacent buttons need `margin` so they do not merge into one mass — that half of "no space around them" is spacing, not contrast, and comes from the design system's spacing scale.

## Known fixes folded into this work

- **Whisker two-tone**: the popup-menu surface must cover every pane of a popup, or none. Resolved in `menu.mjs` by scoping the surface to the popup root rather than to menu-classed children.
- **`*:selected label`**: the rule shipped in `ee09a97` sets `color` on _every_ label under a selected row, which also flattens `.warning`/`.error`/`.success` text inside selected rows. Narrow it to `.dim-label`/subtitle labels, or keep it broad and state the tradeoff explicitly in the comment. Either way it gains a test.
- **Thunar toolbar icon sizes**: not yet attributed. The port has no `toolbar` rules and Thunar exposes no toolbar icon-size setting, so this may not be theme-caused. Confirm by switching to another theme before treating it as in scope.

## Definition of done

1. `npm test` passes, including the generalized contrast gate over every module × 24 combinations.
2. `npm run check` reports no drift.
3. `npm run preview:shots` produces four contact sheets that are reviewed by a human.
4. The gallery is diffed against `gtk3-widget-factory` and no widget it renders is left unstyled.
5. The apps that produced the original reports — Thunar, xfce4-terminal, the Appearance and Window Manager dialogs, Whisker Menu — are spot-checked.

## Sequencing

1. **Safety net, no visual change.** Preview harness, module split, generalized contrast gate. The split is a pure refactor: generated output must be byte-identical, proven by `npm run check` before and after.
2. **Known defects.** Whisker two-tone, control boundary and button margins, `switch`, narrowed `*:selected label`.
3. **Coverage sweep.** Module by module through the unstyled-node list, contact sheet reviewed after each.
4. **GTK4, then GTK2.** Same module structure; GTK4 verified with the widget factory where libadwaita does not override, GTK2 spot-checked against a real GTK2 application.

Phase 1 landing before any visual change is deliberate: it is what makes phases 2–4 verifiable, and it is the only phase whose correctness can be proven mechanically (byte-identical output).

## Risks

- **The module split silently changes output.** Mitigated by requiring byte-identical generated files across the refactor, which `npm run check` already verifies.
- **`GTK_THEME` does not fully apply in a headless Xvfb session**, making screenshots unrepresentative. Probe this early in phase 1; if it proves unreliable, fall back to `GTK_DATA_PREFIX`/`gtk-theme-name` in a generated `settings.ini` for the harness run.
- **Comprehensive coverage invites divergence from the design system's visual language**, since most GTK widgets have no kitchen-sink counterpart. Where a widget has no upstream analogue, derive from the nearest one that does and note the derivation in the module, rather than inventing a look.
- **The derived control boundary may read as heavier than intended** on flavors where it resolves to `text.fg_muted`. Judge on the contact sheets in phase 2; if too heavy, the fallback chain gains an intermediate candidate rather than dropping the 3:1 requirement.
