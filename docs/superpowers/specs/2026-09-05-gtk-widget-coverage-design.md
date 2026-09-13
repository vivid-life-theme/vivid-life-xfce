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
- **Thunar toolbar icon sizes**: no longer reproducing. Thunar captured under `vivid-life-midnight-blue` after the phase 2 sweep shows normal-size toolbar icons on a themed toolbar band. The port had no `toolbar` rules when the report was made; it does now. Re-open only if it recurs.

### Resolved in phase 5 — GTK3 defects found in phase 4

Both shipped in phase 3 (`eb2c3b7`) and were found while porting the same widgets to GTK4. Phase 4 deliberately left `gtk-3.0/` byte-identical to phase 3; **phase 5 fixed both** (`2497c49`), copying the capture-verified GTK4 rules — the first change to GTK3 output since phase 3. Both are the same root cause: **a rule that names a colour but not the glyph or state that makes the widget appear.**

- **`levelbar block.filled` matches nothing.** `tools/templates/gtk3/progress.mjs:21`. There is no `.filled` class in GTK3 **or** GTK4; both use `block:not(.empty)`. A mid-range GTK3 level bar therefore draws no fill at all — only `.low`/`.high`/`.full` blocks paint. Phase 2's review looked at bars at 15/50/90; the 15 and 90 filled via `.low`/`.high`, which is likely why the middle one's absence went unnoticed.
- **The GTK3 spinner is invisible.** `tools/templates/gtk3/progress.mjs:42` sets colour and size only. GTK3's Adwaita defines the spinner exactly as GTK4 does — `opacity: 0` plus `-gtk-icon-source` and a `:checked` animation — and a theme replaces that wholesale, so ours renders an empty box. The GTK4 fix (`3021dc7`) is the template to copy.

### Resolved in design-system 0.10.0 — five semantic tokens were identical to their accent

On **5 of the 72 flavour × variant × kind combinations the semantic token and the accent are the same colour**, so the states they distinguish are not distinguishable at all:

| combination  | collision            | value     |
| ------------ | -------------------- | --------- |
| `dawn-red`   | `danger` == accent   | `#7f1d1d` |
| `dawn-yellow`| `warning` == accent  | `#713f12` |
| `dawn-green` | `success` == accent  | `#365314` |
| `noon-yellow`| `warning` == accent  | `#713f12` |
| `noon-green` | `success` == accent  | `#365314` |

A destructive button is then indistinguishable from a suggested one, a `.high` level-bar block from a plain accent fill, and a warning state from an ordinary accent. This is also the root cause of the worst case in the section below — Dawn Red `.error` at 1.00:1 on a selected row is this collision, not a separate defect.

**Not fixable in this port.** The non-goals forbid redefining upstream token values here, and the fix belongs in `@vivid-life-theme/design-system`: either separate the semantic ramps from the accent ramps, or have the accent-shade table skip a shade that collides. Once upstream guarantees the invariant, the generator should assert it and fail rather than emit a theme where two states render identically. Found by CodeRabbit on PR #3; the 5 combinations above are measured, not estimated.

**Fixed upstream** in `@vivid-life-theme/design-system` 0.10.0 (spec: `docs/superpowers/specs/2026-09-13-semantic-accent-collision-design.md` there). The five colliding accents moved from shade 900 to 800; the semantics stayed — moving them would have failed upstream's own semantic-vs-surface gate on `bg_sunk`. A gate in upstream's `check()` now fails the build on any `danger`/`warning`/`success` role sharing a shade with its hue's accent, with a cross-check so a role rename or addition cannot silently escape it. Re-measured here after the pin bump: **0 collisions** among those three roles. A sixth match — `midnight-blue`, where `info` equals the accent — is accepted upstream as conventional and is a named exemption there, not an oversight.

### Resolved in phase 5 — semantic text on a selected row (GTK3 and GTK4)

Both targets are affected. `.warning`/`.error`/`.success` set `color` on the label directly, which beats a `color` inherited from `:selected` on the row whatever the specificity, so semantic text keeps its own colour over the accent fill. Measured across GTK3 and GTK4: **72 of 72 flavour × variant × kind combinations fall below 4.5:1**, worst Dawn Red `.error` at `#7f1d1d` on `#7f1d1d` — 1.00:1, literally invisible. This is not a regression; it is the visible edge of a tradeoff this document already framed under `*:selected label`, where narrowing the promotion to `.dim-label`/subtitle was chosen precisely so semantic text would not be flattened. That choice is still right for the unselected case. What is missing is that **the pair which actually occurs on screen was never declared**, so no gate models it — the same lesson recorded below. Resolving it needs a decision the coverage phases did not have to make: either promote semantic text to `accent_on` inside a selection and lose the semantic hue there, or give selected rows a fill that keeps all three legible.

**Resolved in phase 5 (`bab9cf1`) by promoting to `accent_on`.** The decision turned out to be forced rather than open: after design-system 0.10.0 removed the five *identical* cases, the failing count stayed at **72 of 72**, worst 1.01:1. A semantic token and an accent token are both chosen to contrast with the background, so they sit in the same luminance band and cannot reliably contrast with each other — no token change can fix it. Inside a selection the row's state carries the meaning; the text has to be readable first. `:selected .warning/.error/.success` now take `accent_on` on both targets, the pair is declared for the gate, and both galleries carry a selected row with semantic text so the rule is capture-verified rather than argued.

## Lessons from the coverage sweep

Four GTK behaviours cost real debugging time in phase 2 and will cost it again in the GTK4/GTK2 phase. Each was established by measurement, not documentation.

- **A theme replaces Adwaita; it does not extend it.** Adwaita is what supplies `-gtk-icon-source` for arrow nodes, so `expander arrow`, `treeview expander` and `combobox arrow` render as an empty indent under our theme until the icon source is named explicitly. Setting `color` alone can never fix this — there is no glyph to tint. GTK ships the `pan-*` symbolic icons in its own gresource, so naming them adds no icon dependency.
- **`*:selected` has zero specificity and loses to any new surface rule.** `treeview.view` (0,1,1) and `.sidebar row` (0,1,1) both silently outranked the global selection fill, unhighlighting every selected row. Any rule that paints or clears a background on a node that can be selected must restate selection at its own specificity.
- **Some container nodes render no background of their own.** A sidebar's surface cannot be painted on `stacksidebar`/`placessidebar`: GTK nests a `scrolledwindow` and a `viewport` in between, and only those inner nodes paint. The surface goes on the viewport and the list, with the scrolledwindow cleared.
- **`background-image` composites over `background-color`.** GTK ships a default handle image for `paned > separator`; a colour-only rule rendered `#cdc7c2` where `#d4d4d4` was asked for. `background-image: none` is required alongside the colour.

Contact-sheet review after every module is what caught all four. Three of them produce output that looks plausible in isolation and is only wrong next to the widget it should match.

### Added in phase 4 (GTK4 and GTK2)

- **Diffing against GTK's own stylesheet is necessary but not sufficient.** Extract it with `objcopy --dump-section .gresource.gtk=<out> <copy of libgtk-4.so.1>` then `gresource extract <out> /org/gtk/libgtk/theme/Default/Default-dark.css`. Work from a _copy_ of the library — `objcopy` cannot write beside the original — and use the distribution `gresource`, since Homebrew's lacks ELF support. This method caught four defects before dispatch that code review would have shipped. It still missed two widgets that rendered nothing, because a stylesheet cannot tell you what a widget looks like.
- **GTK4 gives several nodes no intrinsic size, so a colour-only rule renders nothing.** `progressbar > trough` reserved zero pixels and was absent entirely until `min-height` was set on **both** trough and `> progress` — the child does not inherit it. Whenever a widget is invisible rather than mis-coloured, check dimensions before selectors.
- **The harness can lie about what it rendered, and that is worse than it failing.** `GTK_THEME` resolves by _name_ through `~/.themes`, so the preview scripts render whatever was last installed, not the working tree. A full 24-theme capture plus two widget-factory captures were once read as evidence about current work while every window rendered a stylesheet five days stale (2450 bytes against 23506). Seven defects were reported from those screenshots; all seven were artifacts, and the screenshots looked entirely plausible. `shots4.sh`, `shots2.sh` and `factory.sh` now compare installed against generated and abort. **Verifying against a running system proves nothing until you prove the system runs the thing you changed** — the check is one `cmp`.
- **A harness gap reads exactly like a theme defect.** Two GTK4 findings were the gallery's fault, not the theme's: a level bar with no `hexpand` collapses to a sliver (GTK sets `min-width` only for `.discrete`/`.vertical`, so it collapses under Adwaita too), and `GtkLevelBar`'s built-in `low`/`high` offsets are defined against the default 0–1 interval, so bars built with `new_for_interval(0, 100)` never apply those classes — leaving the `.low`/`.high`/`.full` rules unexercised while appearing to work. Under GTK2, `Gtk.CheckButton(label=…)` constructs a button that renders no text. Before blaming a rule, confirm the harness exercises it.
- **GTK2's `class` binding matches subclasses, and a widget's label is a separate widget.** Both halves bit at once. `class "GtkButton"` also reaches `GtkCheckButton` and `GtkRadioButton`, so the button's `fg[ACTIVE] = accentOn` — right for a pressed button that fills with the accent — was applied to a checked toggle, which stays flat. Its label was therefore drawn in accent-on over the window background: `#171717` on `#171717` on Midnight, `#f5f5f5` on `#f5f5f5` on Noon. Invisible on all 24 combinations. The first fix failed too, for the second half of the rule: binding `class "GtkCheckButton"` changes nothing the label reads, because the text belongs to a child `GtkLabel` matching `class "GtkWidget"`. Only the descendant form, `widget_class "*<GtkCheckButton>*"`, reaches it.
- **Declare the pair that occurs on screen, not the one the rule implies.** The contrast gate modelled `fg[ACTIVE]` against `bg[ACTIVE]` — the accent fill — which is correct and passes on all 24. The pair that actually renders, `fg[ACTIVE]` over `bg[NORMAL]`, was declared by nobody, so there was nothing to fail. A gate only covers the pairs someone thought to write down; an undeclared pair is not a passing pair.
- **A gallery is evidence only for the widget _contexts_ it instantiates.** All three GTK2 defects in phase 4 were context defects — the same widget rendering differently depending on its path — and each stayed invisible until the context existed on the sheet. A checked toggle's label was unreadable on all 24 combinations and `pinentry-gtk-2` has no check buttons; inactive tab labels were unreadable and nothing opened a notebook; then a fix for the tabs muted button labels _on notebook pages_, which twelve reviewed contact sheets could not show because the gallery's pages held only plain labels. Each gap was one level inside the gap just closed. Build the sheet so widgets appear both in and out of the containers that can re-path them, and put the control beside the treatment so the sheet checks itself rather than relying on a reviewer remembering what the other section looked like. **"Every widget is on the sheet" is a much weaker claim than it sounds.**
- **Demonstrate every gate failing before trusting it to pass.** Phase 4 shipped three checks that could not fail: a gtkrc parser probe that invoked `pinentry-gtk-2 --version`, which exits before `gtk_init()` and never parses the file; a `@vl_*` undefined-name test with no assertion that its regex matched anything; and a capture check gating on `[ -s "$png" ]`, which accepts the small valid blank PNG a failed grab writes — a 24-theme sweep reported success while every image was blank. Each was found only by deliberately breaking its input. A gate that cannot fail is worse than no gate, because it is counted as evidence.

## Definition of done

1. `npm test` passes, including the generalized contrast gate over every module × 24 combinations.
2. `npm run check` reports no drift.
3. `npm run preview:shots` produces four contact sheets that are reviewed by a human. From phase 4, the same applies to `preview:shots4` (GTK4) and `preview:shots2` (GTK2) — twelve sheets in total. **Reinstall before capturing**, or the guard in those scripts aborts: they render what is installed, not what is generated.
4. The gallery is diffed against `gtk3-widget-factory` and no widget it renders is left unstyled. From phase 4, likewise against `gtk4-widget-factory`. GTK2 has no widget factory, which is why `gallery2.py` exists.
5. The apps that produced the original reports — Thunar, xfce4-terminal, the Appearance and Window Manager dialogs, Whisker Menu — are spot-checked.

## Sequencing

1. **Safety net, no visual change.** Preview harness, module split, generalized contrast gate. The split is a pure refactor: generated output must be byte-identical, proven by `npm run check` before and after.
2. **Known defects.** Whisker two-tone, control boundary and button margins, `switch`, narrowed `*:selected label`.
3. **Coverage sweep.** Module by module through the unstyled-node list, contact sheet reviewed after each. **Done** — `a516a54..391d101`, planned in `docs/superpowers/plans/2026-09-06-gtk-coverage-phase2.md`. Every node listed above now has rules; verified against `gtk3-widget-factory` and spot-checked in Thunar, xfce4-terminal and the Appearance dialog.
4. **GTK4, then GTK2.** Same module structure; GTK4 verified with the widget factory where libadwaita does not override, GTK2 spot-checked against a real GTK2 application. **Done** — `2d2d712..0359809` (22 commits), planned in `docs/superpowers/plans/2026-09-07-gtk-coverage-phase4.md`. Both targets split into per-widget modules byte-identically, the contrast gate generalized over all three targets, and GTK4 and GTK2 galleries added with contact sheets for all 24 combinations. `gtk-3.0/` is byte-identical to phase 3 throughout, which is why the two GTK3 defects found here are recorded above rather than fixed.
5. **Phase 5 — the open items.** The two GTK3 defects, a GTK4 `infobar.mjs` (GTK4 had none where GTK3 does, and GTK4 paints the fill on `infobar > revealer > box`, not the infobar node — a structural difference the extracted stylesheet showed before a line was written), and semantic text inside selected rows promoted to `accent_on` on both targets. Preceded by design-system 0.10.0, which removed the five semantic/accent collisions upstream. **This is the first phase to change `gtk-3.0/` output since phase 3.** Both galleries gained the contexts these fixes need to be capture-verified: a selected row carrying semantic text, and (GTK4) the four infobar kinds.

#### What phase 4 verified, and what it did not

GTK4 is verified against both the gallery and `gtk4-widget-factory` across all 24 combinations. GTK2 is verified against `gallery2.py` across all 24, plus `pinentry-gtk-2` — the only real GTK2 application on a current machine — at both ends of the flavour range.

The GTK2 gallery exists because `pinentry-gtk-2` renders a dialog, a label, an entry and two buttons and nothing else. Without it, menus, menubar, toolbars, notebooks, tree and column headers, combo boxes, frames and scrolled windows would have shipped verified only by the gtkrc parser accepting the file — which says nothing about whether a rule reaches a widget, and phase 4 twice found GTK4 widgets that parsed cleanly, passed every test, and rendered nothing.

Still unverified: **GTK2 tooltips**, which need a hover the capture cannot produce, and **libadwaita applications**, which override the theme by design and are out of scope per the non-goals.

Phase 1 landing before any visual change is deliberate: it is what makes phases 2–4 verifiable, and it is the only phase whose correctness can be proven mechanically (byte-identical output).

## Risks

- **The module split silently changes output.** Mitigated by requiring byte-identical generated files across the refactor, which `npm run check` already verifies.
- ~~**`GTK_THEME` does not fully apply in a headless Xvfb session**, making screenshots unrepresentative.~~ **Settled in phase 4, but not as written.** `GTK_THEME` applies fully and reliably under Xvfb for GTK3 and GTK4; no `GTK_DATA_PREFIX` fallback was needed. The real hazard was the opposite shape: it applies _perfectly, to whatever is installed in `~/.themes`_, which need not be what you just generated. That produces confident, plausible, entirely false screenshots — strictly more dangerous than a theme that visibly fails to apply. Mitigated by the staleness guard in `shots4.sh`, `shots2.sh` and `factory.sh`. GTK2 sidesteps the problem by selecting with `GTK2_RC_FILES`, which names a file rather than a theme.
- **Comprehensive coverage invites divergence from the design system's visual language**, since most GTK widgets have no kitchen-sink counterpart. Where a widget has no upstream analogue, derive from the nearest one that does and note the derivation in the module, rather than inventing a look.
- **The derived control boundary may read as heavier than intended** on flavors where it resolves to `text.fg_muted`. Judge on the contact sheets in phase 2; if too heavy, the fallback chain gains an intermediate candidate rather than dropping the 3:1 requirement.
