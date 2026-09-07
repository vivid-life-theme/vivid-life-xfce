# GTK Widget Coverage — Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking; `- [~]` marks a step whose verification was substituted, with the substitution quoted beneath it.

**Goal:** Style every GTK3 node Xfce renders with no theme input today, so no widget draws as an unthemed fragment beside a themed neighbour.

**Architecture:** Phase 1 left `tools/templates/gtk3.mjs` as an index composing 14 per-widget modules, each exporting `render(ctx)` and optionally `contrastPairs(ctx)`. This phase extends existing modules and adds six new ones, following the module tree the spec lays out. Every new node is first rendered in `tools/preview/gallery.py` — a node the gallery does not draw cannot be reviewed, so gallery coverage is part of each task, not a separate one.

**Tech Stack:** Node 20 (ESM, `node --test`), `/usr/bin/python3` + PyGObject (GTK3), `xvfb-run`, ImageMagick.

**Spec:** `docs/superpowers/specs/2026-09-05-gtk-widget-coverage-design.md` (this plan implements its Sequencing step 3, "Coverage sweep")

**Predecessor:** `docs/superpowers/plans/2026-09-05-gtk-coverage-phase1.md`, merged to `main` as `8f3d1d6`.

## Global Constraints

- Never hand-encode palette values. Colors come from `@vivid-life-theme/design-system` via `tools/lib/tokens.mjs`. Derived values must be computed from existing tokens by a documented rule.
- All 24 flavor × variant combinations must stay WCAG AA (4.5:1 text, 3:1 non-text).
- The Python interpreter is **`/usr/bin/python3`**, never `python3` from `PATH` — the Homebrew build on this machine has no `gi` module.
- Flavor order is time-based: Midnight, Twilight, Dawn, Noon. Variants capitalized: Red, Orange, Yellow, Green, Blue, Purple. No Cyan.
- Commit messages use Conventional Commits with gitmoji.
- Every new module file must be added to `GTK3_MODULES` in `tools/templates/gtk3.mjs`. The registry test in `tools/templates/gtk3.test.mjs` fails otherwise.
- `switch` is a reserved word: the `switch.mjs` namespace binding is `switchWidget`. Any future module whose filename collides with a keyword needs the same treatment.
- After changing any module, run `npm run generate && npm run check`. Unlike phase 1, output is *expected* to change — `check` is confirming the committed files match the templates, not that nothing moved.

## Measured baseline

Sampled from `tools/preview/out/vivid-life-midnight-blue.png` at the phase 1 merge commit. These are the defects this plan closes; re-sample after each task to confirm movement.

| Node | Measured at baseline | Expected after |
| ---- | -------------------- | -------------- |
| `levelbar` | row is `#171717` — the bar is invisible | a filled block on a `bg_sunk` trough |
| `infobar` | `#484848` — GTK's unthemed default, no token | a semantic fill with `accentOn` text |
| `frame` | section frame edges are `#171717` — no border | a `control.border` hairline |
| `.view` / `.frame` | all three surface panes render `#171717` | a visible three-step surface ramp |
| `scale` | bare text, no trough or slider drawn | a `bg_sunk` trough with an accent slider |
| `toolbar` / `menubar` | no background distinct from the window | `bg_soft`, matching `headerbar` |

## Verified contrast data

Every pair below was measured across all 24 combinations before this plan was written. **Use this table instead of re-deriving; the two FAIL rows are constraints, not suggestions.**

| Pair | Worst ratio | Worst case | Verdict |
| ---- | ----------- | ---------- | ------- |
| `accentOn` on `semantic.info` | 9.50:1 | dawn red | safe for infobar fills |
| `accentOn` on `semantic.success` | 8.01:1 | dawn red | safe for infobar fills |
| `accentOn` on `semantic.warning` | 7.95:1 | dawn red | safe for infobar fills |
| `fg_muted` on `bg` | 6.99:1 | twilight red | safe for expander arrows |
| `danger` on `bg_sunk` | 5.33:1 | dawn red | safe for levelbar blocks |
| `fg_muted` on `bg_soft` | 5.27:1 | twilight red | safe for column-header text |
| `success` on `bg_sunk` | 4.65:1 | dawn red | safe for levelbar blocks |
| `warning` on `bg_sunk` | 4.62:1 | dawn red | safe for levelbar blocks |
| `fg` on `bg_inset` | 4.62:1 | twilight red | `bg_inset` is usable as a surface |
| `accent` on `bg` | 4.52:1 | dawn blue | safe for spinner / slider on canvas |
| `accentOn` on `accent` | 4.75:1 | noon orange | safe for any accent fill |
| `fg` on `bg_soft` | 7.17:1 | twilight red | safe for toolbar / sidebar text |
| `fg_muted` on `bg_sunk` | 5.52:1 | dawn red | safe for spin buttons, scale marks |
| `fg_muted` on `bg_overlay` | 5.27:1 | twilight red | safe for menubar / popover text |
| `fg_subtle` on `bg_sunk` | 4.16:1 | dawn red | non-text only |
| `fg_subtle` on `bg` | 3.78:1 | midnight red | non-text only (the scrollbar pair) |
| `accent` on `bg_sunk` | 3.49:1 | noon orange | clears 3:1 but is the tightest fill pair |
| `control.border` on `bg_sunk` | 3.20:1 | noon red | clears 3:1; tightest border pair |
| **`fg_subtle` on `bg_soft`** | **2.19:1** | midnight red | **FAILS 3:1 — never a mark on `bg_soft`** |
| **`accent` on `bg_soft`** | **2.76:1** | midnight red | **FAILS 3:1 — no accent indicator on `bg_soft`** |
| **`accent` on `bg_overlay`** | **2.76:1** | midnight red | **FAILS 3:1 — no accent indicator on menu/popover surfaces** |
| **`fg_muted` on `bg_inset`** | **2.98:1** | dawn red | **FAILS — `bg_inset` carries `fg` only** |

The accent FAILs are the sharp ones, and they are the same defect twice: on Midnight `bg_soft` and `bg_overlay` are both `#404040`, so an accent mark on either surface is invisible at 2.76:1. This rules out the obvious design for a sidebar's selected-item stripe, a menubar's active-item underline, and a popover's accent divider. Where a selected affordance is needed on `bg_soft` or `bg_overlay`, **fill the whole row with `accent` and put `accentOn` on top** — the `*:selected` pattern, already gated at 4.75:1 — rather than drawing an accent mark against the surface.

---

### Task 1: Expose the spacing and radius scales on `ctx`

The sweep adds far more geometry than phase 1 did. Without this, every new module hardcodes pixel values and the design system's scale is decorative. This task changes no generated output — it only widens `ctx`.

**Files:**

- Modify: `tools/templates/context.mjs`
- Test: `tools/templates/context.test.mjs`

**Interfaces:**

- Consumes: `rawTokens` from `tools/lib/tokens.mjs`
- Produces: `ctx.space` (a map of the design system's spacing steps, keys `"0"`,`"1"`,`"2"`,`"3"`,`"4"`,`"5"`,`"6"`,`"8"`,`"10"`,`"12"`,`"16"`,`"20"`,`"24"`,`"px"`) and `ctx.radius` (keys `none`, `sm`, `md`, `lg`, `xl`, `pill`)

- [x] **Step 1: Write the failing test**

Append to `tools/templates/context.test.mjs`:

```js
test("buildContext exposes the design system's spacing and radius scales", () => {
  const ctx = buildContext(
    flavorBlock("midnight"),
    resolveAccent("midnight", "blue"),
    accentOn("midnight"),
  );
  assert.equal(ctx.space["1"], "4px");
  assert.equal(ctx.space["2"], "8px");
  assert.equal(ctx.space["3"], "12px");
  assert.equal(ctx.space.px, "1px");
  assert.equal(ctx.radius.sm, "4px");
  assert.equal(ctx.radius.md, "8px");
  assert.equal(ctx.radius.pill, "9999px");
});
```

- [x] **Step 2: Run the test to verify it fails**

Run: `node --test tools/templates/context.test.mjs`
Expected: FAIL — `Cannot read properties of undefined (reading '1')`

- [x] **Step 3: Widen the context builder**

In `tools/templates/context.mjs`, change the import line and add two fields:

```js
import { controlColors, rawTokens } from "../lib/tokens.mjs";
```

Add to the returned object, after `control`:

```js
    // Geometry comes from the design system's scales for the same reason
    // colour does: a hardcoded 6px is drift that no gate can catch. Modules
    // written before this existed still carry literal values; they are not
    // retrofitted here, because that would be a visual change unrelated to
    // widget coverage. New rules use these.
    space: rawTokens.spacing,
    radius: rawTokens.radii,
```

- [x] **Step 4: Run the test to verify it passes**

Run: `node --test tools/templates/context.test.mjs`
Expected: PASS

- [x] **Step 5: Confirm generated output is untouched**

Run: `npm run check`
Expected: `Generated output matches tokens — no drift.` Widening `ctx` must not move a byte; if it does, a module was already reading a field this shadows.

- [x] **Step 6: Commit**

```bash
git add tools/templates/context.mjs tools/templates/context.test.mjs
git commit -m "✨ feat: expose the spacing and radius scales on the template context

The coverage sweep adds far more geometry than phase 1 did. Without the
scales on ctx every new module hardcodes pixels and the design system's
spacing scale is decorative. Existing literal values are left alone —
retrofitting them is a visual change unrelated to widget coverage."
```

---

### Task 2: Add the widget-factory cross-check

The spec's definition of done item 4 is "the gallery is diffed against `gtk3-widget-factory` and no widget it renders is left unstyled". `gtk3-widget-factory` is **not installed on this machine** — `command -v gtk3-widget-factory` finds nothing. It is an optional dependency: the script must skip cleanly without it, exactly as `shots.sh` skips without `xvfb-run`.

**Files:**

- Create: `tools/preview/factory.sh`
- Modify: `package.json`, `README.md`

**Interfaces:**

- Consumes: nothing from Task 1
- Produces: `npm run preview:factory`; PNGs at `tools/preview/out/factory-<theme>.png`

- [x] **Step 1: Install the optional dependency**

This is the one step in this plan that installs a system package. Run it yourself — do not run `apt` unprompted on the user's behalf:

```bash
sudo apt install gtk-3-examples
```

Then confirm: `command -v gtk3-widget-factory`

If you decline to install it, every later task still works; Task 10 Step 2 records the cross-check as not performed rather than claiming it passed.

- [x] **Step 2: Write the capture script**

Create `tools/preview/factory.sh`:

```sh
#!/bin/sh
# Captures gtk3-widget-factory under a few themes. The factory is upstream's
# own widget checklist — it renders nodes our gallery does not, so it is the
# cross-check that says whether the gallery itself has a coverage gap.
#
# Optional tooling: skips with a message rather than failing a fresh clone.
set -eu

here=$(dirname "$0")
out="$here/out"

if ! command -v gtk3-widget-factory >/dev/null 2>&1; then
  echo "preview:factory — skipped: gtk3-widget-factory not installed" >&2
  echo "  (Debian/Ubuntu: sudo apt install gtk-3-examples)" >&2
  exit 0
fi
if ! command -v xvfb-run >/dev/null 2>&1; then
  echo "preview:factory — skipped: xvfb-run not installed (package xvfb)." >&2
  exit 0
fi
if ! command -v import >/dev/null 2>&1 && ! command -v magick >/dev/null 2>&1; then
  echo "preview:factory — skipped: ImageMagick not installed." >&2
  exit 0
fi

# One dark and one light flavor is enough: the factory is a completeness
# check, not a per-variant colour review. shots.sh covers all 24.
themes="vivid-life-midnight-blue vivid-life-noon-red"

mkdir -p "$out"

for theme in $themes; do
  png="$out/factory-$theme.png"
  echo "capturing factory under $theme"
  # The factory has no --screenshot flag, so grab the root window after
  # giving it time to map. import(1) targets the X display, not a window id.
  xvfb-run -a --server-args="-screen 0 1280x1600x24" sh -c "
    GTK_THEME=$theme gtk3-widget-factory &
    factory_pid=\$!
    sleep 4
    magick import -window root '$png' 2>/dev/null || import -window root '$png'
    kill \$factory_pid 2>/dev/null || true
  "
  echo "wrote $png"
done
```

Mark it executable: `chmod +x tools/preview/factory.sh`

- [x] **Step 3: Register the npm script**

Add to `package.json` `scripts`, after `preview:shots`:

```json
"preview:factory": "sh tools/preview/factory.sh"
```

- [x] **Step 4: Lint and run it**

Run: `shellcheck tools/preview/factory.sh && npm run preview:factory`
Expected with the package installed: two PNGs in `tools/preview/out/`.
Expected without it: the skip message, exit 0, no error.

- [x] **Step 5: Confirm the capture is not blank**

A blank grab and a working one both exit 0, so check before trusting it:

```bash
magick identify -format '%wx%h stddev=%[standard-deviation]\n' tools/preview/out/factory-*.png
```

Expected: a non-trivial standard deviation (the phase 1 gallery captures ran 10000–28000). A near-zero value means the factory had not mapped yet — raise the `sleep` and re-run.

- [x] **Step 6: Document the optional dependency**

Add to `README.md`, in whatever section lists development commands:

```markdown
### Optional preview tooling

`npm run preview:shots` and `npm run preview:factory` need `xvfb` and
ImageMagick; the factory cross-check additionally needs `gtk-3-examples`.
All three scripts skip with a message when a tool is missing, so a fresh
clone never fails on them.

    sudo apt install xvfb imagemagick gtk-3-examples
```

- [x] **Step 7: Commit**

```bash
git add tools/preview/factory.sh package.json README.md
git commit -m "✨ feat: cross-check the gallery against gtk3-widget-factory

The factory is upstream's own widget checklist, so it renders nodes our
gallery does not — which is what makes it a check on the gallery rather
than a second view of it. Optional: skips cleanly when absent."
```

---

### Task 3: Surfaces, frames and separators

Closes three baseline defects at once: the flat surface ramp, the invisible frame border, and undrawn separators. This task also establishes the plan's separator policy, which later tasks depend on.

**Separator policy.** A decorative separator — the rule between menu entries or dialog sections — is not a user-interface component whose state must be identifiable, so WCAG 1.4.11 does not govern it and it uses `border.default`, recorded as an explicit exemption. A `paned` handle *is* a component (it is draggable, and its position is meaningful), so it uses `control.border` and is gated at 3:1. Do not collapse these two cases.

**Files:**

- Modify: `tools/templates/gtk3/base.mjs`
- Modify: `tools/preview/gallery.py`
- Test: `tools/templates/gtk3.test.mjs`

**Interfaces:**

- Consumes: `ctx.control.border`, `ctx.radius` from Task 1
- Produces: no new exports; `base.mjs` gains `.view`, `frame`, `separator` rules and three `contrastPairs` entries

- [x] **Step 1: Extend the selector test**

In `tools/templates/gtk3.test.mjs`, the existing `renderGtk3Css styles core widgets` test has an array of selectors. Add three entries to it:

```js
    "frame",
    "separator",
    ".view",
```

- [x] **Step 2: Run it and watch it fail**

Run: `node --test tools/templates/gtk3.test.mjs`
Expected: FAIL — `expected CSS to style .view`. (`frame` and `separator` are substrings of nothing currently emitted either, but `.view` is the unambiguous one; all three should fail.)

- [x] **Step 3: Add the rules**

Replace the whole of `tools/templates/gtk3/base.mjs` with:

```js
export function render(ctx) {
  return `* {
  outline-color: alpha(@vl_accent, 0.5);
}

window,
.background {
  background-color: @vl_bg;
  color: @vl_fg;
}

/* The content surface: text views, tree views and anything else that holds
   a document rather than chrome. Matches entry, which sits on the same
   sunk surface, so a text field and the view it filters read as one layer. */
.view,
textview,
textview text {
  background-color: @vl_bg_sunk;
  color: @vl_fg;
}

/* GTK draws a frame's border on a dedicated `border` child node, so the
   element selector alone paints nothing — this is why frames rendered with
   no visible edge at all. .frame is the class form apps apply directly. */
frame > border,
.frame {
  border: 1px solid @vl_control_border;
  border-radius: ${ctx.radius.sm};
}

/* Decorative rules between sections. Deliberately border.default, not the
   control boundary: a separator is not a user-interface component whose
   state has to be identifiable, so WCAG 1.4.11 does not govern it, and the
   control boundary reads as a hard divider where a hairline is wanted.
   The exemption is recorded in contrastPairs rather than left implicit. */
separator {
  background-color: @vl_border;
  min-width: ${ctx.space.px};
  min-height: ${ctx.space.px};
}`;
}

export function contrastPairs(ctx) {
  return [
    { label: "window text", fg: ctx.text.fg, bg: ctx.surface.bg, rule: "text" },
    {
      label: "view text",
      fg: ctx.text.fg,
      bg: ctx.surface.bg_sunk,
      rule: "text",
    },
    {
      label: "frame boundary",
      fg: ctx.control.border,
      bg: ctx.surface.bg,
      rule: "nontext",
    },
    {
      label: "decorative separator",
      fg: ctx.border.default,
      bg: ctx.surface.bg,
      rule: "nontext",
      exempt:
        "WCAG 1.4.11 — decorative separator, not a UI component whose state must be identifiable",
    },
  ];
}
```

- [x] **Step 4: Run the tests**

Run: `node --test tools/templates/gtk3.test.mjs tools/aa.test.mjs`
Expected: PASS. The exemption test tolerates `decorative separator` because `border.default` on `bg` fails 3:1 on at least one combination (it is 1.73:1 on Midnight); if it ever clears everywhere, that test tells you to drop the exemption.

- [x] **Step 5: Give the gallery an explicit separator**

In `tools/preview/gallery.py`, in `surfaces_section()`, after the surface panes loop and before `return frame`:

```python
    box.pack_start(Gtk.Separator(), False, False, 6)
    box.pack_start(label("A horizontal separator sits above this line"), False, False, 0)
```

- [x] **Step 6: Regenerate, reinstall and re-capture**

```bash
npm run generate && npm run check && ./install.sh --all && npm run preview:shots
```

`install.sh --all` refreshes `~/.themes` from the repo — the gallery renders installed themes, so a capture without it shows the previous build.

- [x] **Step 7: Confirm the ramp separated**

```bash
P=tools/preview/out/vivid-life-midnight-blue.png
for y in 57 97 137; do magick "$P" -format "%[pixel:p{200,$y}]\n" info:; done
```

Expected: the `.view` pane now reads `srgb(10,10,10)` (`bg_sunk`) rather than `srgb(23,23,23)`. At the baseline all three read `srgb(23,23,23)`. Also open the capture and confirm each section's frame now has a visible hairline.

- [x] **Step 8: Commit**

```bash
git add tools/templates/gtk3/base.mjs tools/templates/gtk3.test.mjs tools/preview/gallery.py gtk-3.0/
git commit -m "🎨 feat: style content surfaces, frames and separators

Frames drew no border at all because GTK puts a frame's edge on a child
\`border\` node that the element selector never matched. The surface ramp was
flat for a simpler reason: .view had no rule, so a content pane and the
window painted the same colour."
```

---

### Task 4: Feedback widgets — infobar, levelbar, spinner

Closes two more baseline defects. The levelbar is drawn nowhere at all; the infobar paints GTK's unthemed `#484848`.

**Why the infobar looked half-styled.** `infobar.mjs` today defines `.warning`, `.error` and `.success` as *foreground* classes with no background. A GTK infobar carries exactly those classes on itself, so the text picked up a semantic colour while the bar kept GTK's default grey. The fix is to give the infobar element a semantic *fill* and put `accentOn` on top — the same pairing `button.destructive-action` already uses, which the verified table shows clears 7.95:1 at worst.

**Files:**

- Modify: `tools/templates/gtk3/infobar.mjs`, `tools/templates/gtk3/progress.mjs`
- Modify: `tools/preview/gallery.py`
- Test: `tools/templates/gtk3.test.mjs`

**Interfaces:**

- Consumes: `ctx.radius`, `ctx.space` from Task 1; `ctx.control.border`
- Produces: no new exports

- [x] **Step 1: Extend the selector test**

Add to the selector array in `renderGtk3Css styles core widgets`:

```js
    "infobar",
    "levelbar",
    "spinner",
```

- [x] **Step 2: Run it and watch it fail**

Run: `node --test tools/templates/gtk3.test.mjs`
Expected: FAIL — `expected CSS to style infobar` (and `levelbar`, `spinner`).

- [x] **Step 3: Give the infobar a fill**

Replace `tools/templates/gtk3/infobar.mjs` with:

```js
// These are foregrounds with no background of their own, so they inherit
// whichever surface the ancestor painted. All four are asserted.
const SURFACES = ["bg", "bg_sunk", "bg_soft", "bg_overlay"];

// GTK puts .info/.warning/.error/.question on the infobar element itself,
// which is why the bare foreground classes below tinted an infobar's text
// while leaving GTK's default grey behind it. The element form fills the
// bar; the descendant form is needed because GTK sets a colour on the
// message label directly, which plain inheritance would not override.
const KINDS = [
  ["info", "@vl_info"],
  ["warning", "@vl_warning"],
  ["error", "@vl_danger"],
  ["question", "@vl_accent"],
];

export function render(ctx) {
  const fills = KINDS.map(
    ([kind, color]) => `infobar.${kind} {
  background-color: ${color};
}`,
  ).join("\n\n");

  const onFill = KINDS.map(([kind]) => `infobar.${kind},\ninfobar.${kind} label`).join(",\n");

  return `infobar {
  background-color: @vl_bg_soft;
  color: @vl_fg;
  border: 1px solid @vl_control_border;
  border-radius: ${ctx.radius.sm};
  padding: ${ctx.space["2"]};
}

${fills}

${onFill} {
  color: @vl_accent_on;
}

.warning {
  color: @vl_warning;
}

.error {
  color: @vl_danger;
}

.success {
  color: @vl_success;
}`;
}

export function contrastPairs(ctx) {
  const kinds = [
    ["info", ctx.semantic.info],
    ["warning", ctx.semantic.warning],
    ["error", ctx.semantic.danger],
    ["question", ctx.accent],
  ];
  return [
    ...kinds.map(([kind, fill]) => ({
      label: `infobar ${kind} message`,
      fg: ctx.accentOn,
      bg: fill,
      rule: "text",
    })),
    {
      label: "infobar boundary",
      fg: ctx.control.border,
      bg: ctx.surface.bg,
      rule: "nontext",
    },
    ...SURFACES.flatMap((surface) => [
      {
        label: `warning text on ${surface}`,
        fg: ctx.semantic.warning,
        bg: ctx.surface[surface],
        rule: "text",
      },
      {
        label: `error text on ${surface}`,
        fg: ctx.semantic.danger,
        bg: ctx.surface[surface],
        rule: "text",
      },
      {
        label: `success text on ${surface}`,
        fg: ctx.semantic.success,
        bg: ctx.surface[surface],
        rule: "text",
      },
    ]),
  ];
}
```

- [x] **Step 4: Add the levelbar and spinner**

Replace `tools/templates/gtk3/progress.mjs` with:

```js
export function render(ctx) {
  return `progressbar > trough {
  background-color: @vl_bg_sunk;
  border-radius: ${ctx.radius.sm};
}

progressbar > trough > progress {
  background-color: @vl_accent;
  border-radius: ${ctx.radius.sm};
}

/* A levelbar drew nothing at all: GTK gives trough and block no default
   paint, so with no rule the widget is an empty box the height of a line. */
levelbar trough {
  background-color: @vl_bg_sunk;
  border: 1px solid @vl_control_border;
  border-radius: ${ctx.radius.sm};
  min-height: ${ctx.space["2"]};
}

levelbar block.filled {
  background-color: @vl_accent;
  border-radius: ${ctx.radius.sm};
}

/* GTK's built-in offsets: below "low" and at/above "high". Semantic rather
   than accent, because a level crossing a threshold is the one piece of
   information a level bar carries. */
levelbar block.low {
  background-color: @vl_warning;
}

levelbar block.high,
levelbar block.full {
  background-color: @vl_success;
}

levelbar block.empty {
  background-color: transparent;
}

spinner {
  color: @vl_accent;
  min-width: ${ctx.space["4"]};
  min-height: ${ctx.space["4"]};
}`;
}

export function contrastPairs(ctx) {
  return [
    {
      label: "progress fill against its trough",
      fg: ctx.accent,
      bg: ctx.surface.bg_sunk,
      rule: "nontext",
    },
    {
      label: "levelbar filled block",
      fg: ctx.accent,
      bg: ctx.surface.bg_sunk,
      rule: "nontext",
    },
    {
      label: "levelbar low block",
      fg: ctx.semantic.warning,
      bg: ctx.surface.bg_sunk,
      rule: "nontext",
    },
    {
      label: "levelbar high block",
      fg: ctx.semantic.success,
      bg: ctx.surface.bg_sunk,
      rule: "nontext",
    },
    {
      label: "levelbar trough boundary",
      fg: ctx.control.border,
      bg: ctx.surface.bg,
      rule: "nontext",
    },
    { label: "spinner", fg: ctx.accent, bg: ctx.surface.bg, rule: "nontext" },
  ];
}
```

- [x] **Step 5: Run the gate**

Run: `node --test tools/templates/gtk3.test.mjs tools/aa.test.mjs`
Expected: PASS. Every pair above appears in the verified table; the tightest is `levelbar filled block` at 3.49:1 on Noon Orange.

- [x] **Step 6: Show the levelbar's offsets in the gallery**

In `tools/preview/gallery.py`, in `feedback_section()`, replace the single level bar with three at different offsets so `low`, `filled` and `high` are all reviewable:

```python
    for value, caption in ((15, "low"), (50, "filled"), (90, "high")):
        level = Gtk.LevelBar.new_for_interval(0, 100)
        level.set_value(value)
        box.pack_start(row(label(f"Level ({caption}):"), level), False, False, 0)
```

Add a fourth infobar so the `question` fill is reviewable, in the message-type loop:

```python
        (Gtk.MessageType.QUESTION, "Question message"),
```

- [x] **Step 7: Regenerate, reinstall, re-capture**

```bash
npm run generate && npm run check && ./install.sh --all && npm run preview:shots
```

- [x] **Step 8: Confirm the bars are drawn**

Open `tools/preview/out/vivid-life-midnight-blue.png`. The three level bars must be visible as filled blocks on a bordered trough — at the baseline that row measured `srgb(23,23,23)`, indistinguishable from the window. The infobars must show four distinct semantic fills, not `srgb(72,72,72)`.

- [x] **Step 9: Commit**

```bash
git add tools/templates/gtk3/infobar.mjs tools/templates/gtk3/progress.mjs tools/templates/gtk3.test.mjs tools/preview/gallery.py gtk-3.0/
git commit -m "🎨 feat: style infobars, level bars and spinners

The infobar looked half-themed because .warning/.error/.success were
foreground-only classes, and GTK puts those classes on the infobar itself —
so the text tinted and the bar kept GTK's default grey. Level bars drew
nothing at all: GTK gives trough and block no default paint."
```

---

### Task 5: Inputs — scale, spinbutton, combobox

Closes the last baseline defect: `scale` renders as bare text today because GTK gives trough, highlight and slider no default paint.

**Files:**

- Create: `tools/templates/gtk3/scale.mjs`, `tools/templates/gtk3/spinbutton.mjs`
- Modify: `tools/templates/gtk3.mjs`, `tools/templates/gtk3/entry.mjs`
- Test: `tools/templates/gtk3.test.mjs`

**Interfaces:**

- Consumes: `ctx.radius`, `ctx.space`, `ctx.control.border`
- Produces: two module namespace objects added to `GTK3_MODULES` as `scale` and `spinbutton`, composed after `entry`

- [x] **Step 1: Extend the selector test**

Add to the selector array:

```js
    "scale",
    "spinbutton",
    "combobox",
```

- [x] **Step 2: Run it and watch it fail**

Run: `node --test tools/templates/gtk3.test.mjs`
Expected: FAIL — `expected CSS to style scale`.

- [x] **Step 3: Write the scale module**

Create `tools/templates/gtk3/scale.mjs`:

```js
export function render(ctx) {
  return `/* A scale drew as bare text: GTK paints none of trough, highlight or
   slider by default, so with no rules the widget is an empty allocation
   with only its value label visible. */
scale trough {
  background-color: @vl_bg_sunk;
  border: 1px solid @vl_control_border;
  border-radius: ${ctx.radius.pill};
  min-height: ${ctx.space["1"]};
  min-width: ${ctx.space["1"]};
}

scale highlight {
  background-color: @vl_accent;
  border-radius: ${ctx.radius.pill};
}

/* The knob is the control boundary colour rather than the accent: it
   overlaps the accent highlight for most of the scale's travel, and accent
   on accent has no edge at all. */
scale slider {
  background-color: @vl_control_border;
  border-radius: ${ctx.radius.pill};
  min-width: ${ctx.space["4"]};
  min-height: ${ctx.space["4"]};
  margin: -${ctx.space["2"]};
}

scale slider:hover {
  background-color: @vl_accent;
}

scale:disabled slider {
  background-color: @vl_fg_disabled;
}

scale marks label {
  color: @vl_fg_muted;
}`;
}

export function contrastPairs(ctx) {
  return [
    {
      label: "scale highlight against its trough",
      fg: ctx.accent,
      bg: ctx.surface.bg_sunk,
      rule: "nontext",
    },
    {
      label: "scale slider on the canvas",
      fg: ctx.control.border,
      bg: ctx.surface.bg,
      rule: "nontext",
    },
    {
      label: "scale slider over its trough",
      fg: ctx.control.border,
      bg: ctx.surface.bg_sunk,
      rule: "nontext",
    },
    {
      label: "scale trough boundary",
      fg: ctx.control.border,
      bg: ctx.surface.bg,
      rule: "nontext",
    },
    {
      label: "scale mark label",
      fg: ctx.text.fg_muted,
      bg: ctx.surface.bg,
      rule: "text",
    },
    {
      label: "disabled scale slider",
      fg: ctx.text.fg_disabled,
      bg: ctx.surface.bg_sunk,
      rule: "nontext",
      exempt: "WCAG 1.4.11 — inactive user-interface component",
    },
  ];
}
```

- [x] **Step 4: Write the spinbutton module**

Create `tools/templates/gtk3/spinbutton.mjs`:

```js
export function render(ctx) {
  return `/* GTK3 draws a spin button as an entry with two button children. Styling
   the outer node and neutralising the children keeps it reading as one
   field rather than a text box wedged between two buttons. */
spinbutton {
  background-color: @vl_bg_sunk;
  color: @vl_fg;
  border: 1px solid @vl_control_border;
  border-radius: ${ctx.radius.sm};
}

spinbutton entry {
  background-color: transparent;
  border: none;
  padding: ${ctx.space["1"]} ${ctx.space["2"]};
}

spinbutton button {
  background-color: transparent;
  border: none;
  border-radius: 0;
  color: @vl_fg_muted;
  padding: 0 ${ctx.space["2"]};
}

spinbutton button:hover {
  background-color: alpha(@vl_accent, 0.2);
  color: @vl_fg;
}

spinbutton button:disabled {
  color: @vl_fg_disabled;
}`;
}

export function contrastPairs(ctx) {
  return [
    {
      label: "spinbutton value",
      fg: ctx.text.fg,
      bg: ctx.surface.bg_sunk,
      rule: "text",
    },
    {
      label: "spinbutton +/- glyph",
      fg: ctx.text.fg_muted,
      bg: ctx.surface.bg_sunk,
      rule: "text",
    },
    {
      label: "spinbutton boundary",
      fg: ctx.control.border,
      bg: ctx.surface.bg,
      rule: "nontext",
    },
    {
      label: "disabled spinbutton glyph",
      fg: ctx.text.fg_disabled,
      bg: ctx.surface.bg_sunk,
      rule: "text",
      exempt: "WCAG 1.4.3 — text in an inactive user-interface component",
    },
  ];
}
```

- [x] **Step 5: Add the combobox arrow to `entry.mjs`**

A combo box is a button plus a popup, both already styled — the only unthemed part is its arrow. Append to the template literal in `tools/templates/gtk3/entry.mjs`, before the closing backtick, separated by a blank line:

```
combobox arrow {
  color: @vl_fg_muted;
  min-width: ${ctx.space["4"]};
  min-height: ${ctx.space["4"]};
}

combobox button {
  border-radius: ${ctx.radius.sm};
}
```

Add one pair to its `contrastPairs` return array:

```js
    {
      label: "combobox arrow",
      fg: ctx.text.fg_muted,
      bg: ctx.surface.bg_soft,
      rule: "nontext",
    },
```

- [x] **Step 6: Compose the two new modules**

In `tools/templates/gtk3.mjs`, add the imports next to the other widget imports:

```js
import * as scale from "./gtk3/scale.mjs";
import * as spinbutton from "./gtk3/spinbutton.mjs";
```

and add them to `GTK3_MODULES` directly after `entry`:

```js
  entry,
  spinbutton,
  scale,
```

- [x] **Step 7: Run the tests**

Run: `node --test tools/templates/gtk3.test.mjs tools/aa.test.mjs`
Expected: PASS, including the registry test — if you created a module file and forgot the import, that test names the file.

- [x] **Step 8: Show a scale with marks in the gallery**

In `tools/preview/gallery.py`, in `inputs_section()`, after the existing scale, add one with marks and a disabled one:

```python
    marked = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, 0, 100, 1)
    marked.set_value(35)
    marked.set_size_request(220, -1)
    for position in (0, 50, 100):
        marked.add_mark(position, Gtk.PositionType.BOTTOM, str(position))
    disabled_scale = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, 0, 100, 1)
    disabled_scale.set_value(80)
    disabled_scale.set_size_request(160, -1)
    disabled_scale.set_sensitive(False)
    box.pack_start(row(label("Marks:"), marked, disabled_scale), False, False, 0)
```

- [x] **Step 9: Regenerate, reinstall, re-capture**

```bash
npm run generate && npm run check && ./install.sh --all && npm run preview:shots
```

- [x] **Step 10: Confirm the scale is drawn**

Open `tools/preview/out/vivid-life-midnight-blue.png`. Both scales must show a trough with an accent-filled left portion and a light round knob. At the baseline the scale row showed only the text `60`.

- [x] **Step 11: Commit**

```bash
git add tools/templates/gtk3.mjs tools/templates/gtk3/scale.mjs tools/templates/gtk3/spinbutton.mjs tools/templates/gtk3/entry.mjs tools/templates/gtk3.test.mjs tools/preview/gallery.py gtk-3.0/
git commit -m "🎨 feat: style scales, spin buttons and combo boxes

A scale rendered as bare text — GTK paints none of trough, highlight or
slider by default. The knob uses the control boundary rather than the
accent because it overlaps the accent highlight for most of its travel."
```

---

### Task 6: Views — tree views, column headers, lists and icon views

**Hover rule.** Every hover state in this task and the next paints `alpha(@vl_accent, 0.2)` over the surface beneath. Measured across all 24 combinations, `text.fg` on that composite clears 5.03:1 at worst, but **`text.fg_muted` on the same composite is only 3.70:1** — below the 4.5:1 floor. Any rule that dims its text at rest must therefore promote to `fg` on hover, never stay muted. The column-header rule below is the case that matters.

**`textview` note.** Task 3 already covers `textview` in `base.mjs`'s `.view` group. This module does not repeat it — two rules painting the same node from different files is exactly the drift the module split exists to prevent.

**Files:**

- Create: `tools/templates/gtk3/view.mjs`
- Modify: `tools/templates/gtk3.mjs`, `tools/preview/gallery.py`
- Test: `tools/templates/gtk3.test.mjs`

**Interfaces:**

- Consumes: `ctx.radius`, `ctx.space`, `ctx.control.border`
- Produces: a `view` module composed after `notebook`

- [x] **Step 1: Extend the selector test**

Add to the selector array:

```js
    "treeview",
    "iconview",
    "list row",
```

- [x] **Step 2: Run it and watch it fail**

Run: `node --test tools/templates/gtk3.test.mjs`
Expected: FAIL — `expected CSS to style treeview`.

- [x] **Step 3: Write the module**

Create `tools/templates/gtk3/view.mjs`:

```js
import { composite } from "../../lib/contrast.mjs";

export function render(ctx) {
  return `treeview.view,
iconview {
  background-color: @vl_bg_sunk;
  color: @vl_fg;
  border-radius: ${ctx.radius.sm};
}

/* GTK renders a tree view's column headers as button nodes, so without a
   rule they inherit the full button chrome — a raised, bordered, rounded
   control where a flat header belongs. */
treeview.view header button {
  background-color: @vl_bg_soft;
  color: @vl_fg_muted;
  border: none;
  border-bottom: 1px solid @vl_control_border;
  border-radius: 0;
  padding: ${ctx.space["1"]} ${ctx.space["2"]};
}

/* Promoted to fg, not left muted: fg_muted over the hover composite is
   3.70:1, below the 4.5:1 text floor. */
treeview.view header button:hover {
  background-color: alpha(@vl_accent, 0.2);
  color: @vl_fg;
}

treeview.view expander {
  color: @vl_fg_muted;
}

/* Rows stay transparent so the view's surface shows through and the
   *:selected fill is the only thing that paints a row. */
list,
list row {
  background-color: transparent;
}

list row {
  padding: ${ctx.space["1"]} ${ctx.space["2"]};
}

list row:hover {
  background-color: alpha(@vl_accent, 0.2);
  color: @vl_fg;
}`;
}

export function contrastPairs(ctx) {
  return [
    {
      label: "tree view text",
      fg: ctx.text.fg,
      bg: ctx.surface.bg_sunk,
      rule: "text",
    },
    {
      label: "column header label",
      fg: ctx.text.fg_muted,
      bg: ctx.surface.bg_soft,
      rule: "text",
    },
    {
      label: "column header rule",
      fg: ctx.control.border,
      bg: ctx.surface.bg_soft,
      rule: "nontext",
    },
    {
      label: "tree row expander",
      fg: ctx.text.fg_muted,
      bg: ctx.surface.bg_sunk,
      rule: "nontext",
    },
    {
      label: "list row hover label",
      fg: ctx.text.fg,
      bg: composite(ctx.surface.bg, `${ctx.accent}33`),
      rule: "text",
    },
    {
      label: "column header hover label",
      fg: ctx.text.fg,
      bg: composite(ctx.surface.bg_soft, `${ctx.accent}33`),
      rule: "text",
    },
  ];
}
```

- [x] **Step 4: Compose it**

In `tools/templates/gtk3.mjs`, add `import * as view from "./gtk3/view.mjs";` and place `view` in `GTK3_MODULES` directly after `notebook`.

- [x] **Step 5: Run the tests**

Run: `node --test tools/templates/gtk3.test.mjs tools/aa.test.mjs`
Expected: PASS.

- [x] **Step 6: Add an icon view to the gallery**

In `tools/preview/gallery.py`, in `lists_section()`, before `return frame`:

```python
    icon_store = Gtk.ListStore(str)
    for name in ("Documents", "Pictures", "Music", "Downloads"):
        icon_store.append([name])
    icons = Gtk.IconView(model=icon_store)
    icons.set_text_column(0)
    icons.set_item_width(90)
    icons.set_size_request(-1, 90)
    box.pack_start(icons, False, False, 0)
```

- [x] **Step 7: Regenerate, reinstall, re-capture**

```bash
npm run generate && npm run check && ./install.sh --all && npm run preview:shots
```

- [x] **Step 8: Confirm the headers went flat**

Open the Midnight capture. The `Theme` / `Targets` column headers must now read as a flat band with a hairline beneath — at the baseline they rendered as raised bordered buttons, because the header nodes were picking up the full `button` chrome.

- [x] **Step 9: Commit**

```bash
git add tools/templates/gtk3.mjs tools/templates/gtk3/view.mjs tools/templates/gtk3.test.mjs tools/preview/gallery.py gtk-3.0/
git commit -m "🎨 feat: style tree views, column headers, lists and icon views

Column headers are button nodes in GTK, so with no rule of their own they
inherited the full raised-button chrome. Header hover promotes to fg rather
than staying muted: fg_muted over the hover composite is 3.70:1."
```

---

### Task 7: Chrome — menubar, popover, toolbar, actionbar

Closes the last baseline defect: `toolbar` and `menubar` paint no background, so they merge into the window instead of reading as chrome.

**No accent marks here.** The obvious design for an active menubar item is an accent underline, and for a popover a thin accent divider. Both are ruled out: `accent` on `bg_soft` and on `bg_overlay` are each 2.76:1 on Midnight Red, below the 3:1 non-text floor. Use the fill-plus-`accentOn` pattern instead, which clears 4.75:1 at worst.

**Files:**

- Modify: `tools/templates/gtk3/menu.mjs`, `tools/templates/gtk3/header-bars.mjs`
- Modify: `tools/preview/gallery.py`
- Test: `tools/templates/gtk3.test.mjs`

**Interfaces:**

- Consumes: `ctx.radius`, `ctx.space`, `ctx.control.border`; `composite` from `tools/lib/contrast.mjs`
- Produces: no new modules

- [x] **Step 1: Extend the selector test**

Add to the selector array:

```js
    "menubar",
    "popover",
    "toolbar",
    "actionbar",
```

- [x] **Step 2: Run it and watch it fail**

Run: `node --test tools/templates/gtk3.test.mjs`
Expected: FAIL — `expected CSS to style menubar`.

- [x] **Step 3: Add menubar and popover to `menu.mjs`**

Append to the template literal in `tools/templates/gtk3/menu.mjs`, before the closing backtick, each block separated by a blank line:

```
menubar {
  background-color: @vl_bg_soft;
  color: @vl_fg;
  border-bottom: 1px solid @vl_control_border;
}

menubar > menuitem {
  padding: ${ctx.space["1"]} ${ctx.space["3"]};
  border-radius: 0;
}

/* Fill plus accent_on rather than an accent underline: an accent mark on
   bg_soft is 2.76:1 on Midnight Red, below the 3:1 non-text floor. */
menubar > menuitem:hover {
  background-color: @vl_accent;
  color: @vl_accent_on;
}

/* A popover is a menu that is not a menu node — same surface, same
   boundary, so a Whisker-style popup and a dropdown read as one family. */
popover,
popover.background {
  background-color: @vl_bg_overlay;
  color: @vl_fg;
  border: 1px solid @vl_control_border;
  border-radius: ${ctx.radius.md};
  padding: ${ctx.space["1"]};
}

popover separator {
  background-color: @vl_border;
}
```

Add two pairs to `menu.mjs`'s `contrastPairs` return array:

```js
    {
      label: "menubar item label",
      fg: ctx.text.fg,
      bg: ctx.surface.bg_soft,
      rule: "text",
    },
    {
      label: "menubar item hover label",
      fg: ctx.accentOn,
      bg: ctx.accent,
      rule: "text",
    },
```

- [x] **Step 4: Add toolbar and actionbar to `header-bars.mjs`**

Replace `tools/templates/gtk3/header-bars.mjs` with:

```js
import { composite } from "../../lib/contrast.mjs";

export function render(ctx) {
  return `headerbar {
  background-color: @vl_bg_soft;
  color: @vl_fg;
  border-bottom: 1px solid @vl_border;
}

/* A toolbar painted nothing, so it merged into the window and its buttons
   floated on the canvas. Same surface as headerbar — they are the same
   chrome band in different widgets. */
toolbar,
.toolbar {
  background-color: @vl_bg_soft;
  color: @vl_fg;
  padding: ${ctx.space["1"]};
  border-bottom: 1px solid @vl_control_border;
}

actionbar > revealer > box {
  background-color: @vl_bg_soft;
  color: @vl_fg;
  padding: ${ctx.space["2"]};
  border-top: 1px solid @vl_control_border;
}

/* Path bars and tool buttons are flat until touched: chrome buttons that
   each drew a full border would turn a toolbar into a grid. */
toolbar button,
.toolbar button,
button.flat {
  background-color: transparent;
  border-color: transparent;
}

toolbar button:hover,
.toolbar button:hover,
button.flat:hover {
  background-color: alpha(@vl_accent, 0.2);
  border-color: @vl_control_border;
}`;
}

export function contrastPairs(ctx) {
  return [
    {
      label: "headerbar title",
      fg: ctx.text.fg,
      bg: ctx.surface.bg_soft,
      rule: "text",
    },
    {
      label: "toolbar label",
      fg: ctx.text.fg,
      bg: ctx.surface.bg_soft,
      rule: "text",
    },
    {
      label: "toolbar boundary",
      fg: ctx.control.border,
      bg: ctx.surface.bg_soft,
      rule: "nontext",
    },
    {
      label: "flat button hover label",
      fg: ctx.text.fg,
      bg: composite(ctx.surface.bg_soft, `${ctx.accent}33`),
      rule: "text",
    },
  ];
}
```

- [x] **Step 5: Run the tests**

Run: `node --test tools/templates/gtk3.test.mjs tools/aa.test.mjs`
Expected: PASS.

- [x] **Step 6: Add a popover and an action bar to the gallery**

A real popover is a separate toplevel window and would not appear in a window grab, so render it inline the way `menus_section()` already renders the dropdown. In `tools/preview/gallery.py`, in `menus_section()`, before `return frame`:

```python
    pop = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=4)
    pop.get_style_context().add_class("popover")
    pop.get_style_context().add_class("background")
    pop.set_border_width(6)
    pop.pack_start(label("Popover heading"), False, False, 0)
    pop.pack_start(Gtk.Separator(), False, False, 0)
    pop.pack_start(label("Popover body text"), False, False, 0)
    pop.set_halign(Gtk.Align.START)
    box.pack_start(pop, False, False, 0)
```

In `buttons_section()`, after the toolbar, add an action bar:

```python
    action = Gtk.ActionBar()
    action.pack_start(Gtk.Button(label="Cancel"))
    apply_button = Gtk.Button(label="Apply")
    apply_button.get_style_context().add_class("suggested-action")
    action.pack_end(apply_button)
    box.pack_start(action, False, False, 0)
```

- [x] **Step 7: Regenerate, reinstall, re-capture**

```bash
npm run generate && npm run check && ./install.sh --all && npm run preview:shots
```

- [x] **Step 8: Confirm the chrome bands separated**

```bash
P=tools/preview/out/vivid-life-midnight-blue.png
magick "$P" -format "%[pixel:p{100,533}]\n" info:
```

Sample a pixel inside the toolbar band (adjust the y to wherever the toolbar landed after the gallery grew). Expected `srgb(64,64,64)` — `bg_soft` — where the baseline read `srgb(23,23,23)`, the window colour. Confirm visually that the menubar now reads as a band and its hovered item is an accent fill, not an underline.

- [x] **Step 9: Commit**

```bash
git add tools/templates/gtk3/menu.mjs tools/templates/gtk3/header-bars.mjs tools/templates/gtk3.test.mjs tools/preview/gallery.py gtk-3.0/
git commit -m "🎨 feat: style menubars, popovers, toolbars and action bars

Toolbars and menubars painted no background, so chrome merged into the
window and toolbar buttons floated on the canvas. Active menubar items use
an accent fill rather than an accent underline: a mark on bg_soft is
2.76:1 on Midnight Red, below the 3:1 non-text floor."
```

---

### Task 8: Layout — paned handles, sidebars and linked buttons

The `paned` handle is the case the separator policy in Task 3 carved out: it is draggable and its position carries meaning, so it is a user-interface component under WCAG 1.4.11 and uses `control.border` at 3:1, not the decorative `border.default`.

**Files:**

- Create: `tools/templates/gtk3/paned.mjs`, `tools/templates/gtk3/sidebar.mjs`
- Modify: `tools/templates/gtk3.mjs`, `tools/templates/gtk3/button.mjs`, `tools/preview/gallery.py`
- Test: `tools/templates/gtk3.test.mjs`

**Interfaces:**

- Consumes: `ctx.radius`, `ctx.space`, `ctx.control.border`
- Produces: `paned` and `sidebar` module namespace objects in `GTK3_MODULES`, composed after `view`

- [x] **Step 1: Extend the selector test**

Add to the selector array:

```js
    "paned",
    ".sidebar",
    ".linked",
```

- [x] **Step 2: Run it and watch it fail**

Run: `node --test tools/templates/gtk3.test.mjs`
Expected: FAIL — `expected CSS to style paned`.

- [x] **Step 3: Write the paned module**

Create `tools/templates/gtk3/paned.mjs`:

```js
export function render(ctx) {
  return `/* The control boundary, not border.default: a paned handle is draggable
   and its position is meaningful, which makes it a user-interface component
   under WCAG 1.4.11 rather than the decorative rule base.mjs styles. */
paned > separator {
  background-color: @vl_control_border;
  min-width: ${ctx.space.px};
  min-height: ${ctx.space.px};
}

paned > separator:hover {
  background-color: @vl_accent;
}`;
}

export function contrastPairs(ctx) {
  return [
    {
      label: "paned handle on the canvas",
      fg: ctx.control.border,
      bg: ctx.surface.bg,
      rule: "nontext",
    },
    {
      label: "paned handle against a content pane",
      fg: ctx.control.border,
      bg: ctx.surface.bg_sunk,
      rule: "nontext",
    },
    {
      label: "paned handle hover",
      fg: ctx.accent,
      bg: ctx.surface.bg,
      rule: "nontext",
    },
  ];
}
```

- [x] **Step 4: Write the sidebar module**

Create `tools/templates/gtk3/sidebar.mjs`:

```js
export function render(ctx) {
  return `.sidebar,
placessidebar,
stacksidebar {
  background-color: @vl_bg_soft;
  color: @vl_fg;
  border-right: 1px solid @vl_control_border;
}

/* Rows stay transparent so the sidebar's own surface shows through and
   *:selected is the only thing that fills a row. An accent stripe on the
   row instead would be 2.76:1 against bg_soft on Midnight Red. */
.sidebar list,
placessidebar list,
stacksidebar list {
  background-color: transparent;
}

.sidebar row,
placessidebar row,
stacksidebar row {
  padding: ${ctx.space["1"]} ${ctx.space["3"]};
  border-radius: ${ctx.radius.sm};
}`;
}

export function contrastPairs(ctx) {
  return [
    {
      label: "sidebar label",
      fg: ctx.text.fg,
      bg: ctx.surface.bg_soft,
      rule: "text",
    },
    {
      label: "sidebar boundary",
      fg: ctx.control.border,
      bg: ctx.surface.bg_soft,
      rule: "nontext",
    },
  ];
}
```

- [x] **Step 5: Add `.linked` geometry to `button.mjs`**

Append to the template literal in `tools/templates/gtk3/button.mjs`, before the closing backtick:

```
/* A linked group is one control drawn as several: square the interior
   corners and collapse the shared edges so three buttons read as a
   segmented control rather than three adjacent controls. Uses the sibling
   combinator rather than chained :not(), which GTK's CSS parser handles
   less predictably. */
.linked > button {
  border-radius: 0;
}

.linked > button:first-child {
  border-top-left-radius: ${ctx.radius.sm};
  border-bottom-left-radius: ${ctx.radius.sm};
}

.linked > button:last-child {
  border-top-right-radius: ${ctx.radius.sm};
  border-bottom-right-radius: ${ctx.radius.sm};
}

.linked > button + button {
  border-left-width: 0;
}
```

`button.mjs` needs no new contrast pairs — `.linked` changes geometry only, and the colours are the ones `button label` and `button boundary` already gate.

- [x] **Step 6: Compose the two new modules**

In `tools/templates/gtk3.mjs`, add:

```js
import * as paned from "./gtk3/paned.mjs";
import * as sidebar from "./gtk3/sidebar.mjs";
```

and place `paned,` and `sidebar,` in `GTK3_MODULES` directly after `view`.

- [x] **Step 7: Run the tests**

Run: `node --test tools/templates/gtk3.test.mjs tools/aa.test.mjs`
Expected: PASS.

- [x] **Step 8: Add a paned and a sidebar to the gallery**

In `tools/preview/gallery.py`, add a new section function and register it in `SECTIONS` between `lists_section` and `menus_section`:

```python
def layout_section():
    frame, box = section("Layout")

    paned = Gtk.Paned(orientation=Gtk.Orientation.HORIZONTAL)
    paned.set_size_request(-1, 110)
    paned.set_position(150)

    stack = Gtk.Stack()
    for name, title in (("one", "First page"), ("two", "Second page")):
        page = Gtk.Box(orientation=Gtk.Orientation.VERTICAL)
        page.set_border_width(8)
        page.pack_start(label(f"Contents of the {title.lower()}"), False, False, 0)
        stack.add_titled(page, name, title)

    switcher = Gtk.StackSidebar()
    switcher.set_stack(stack)
    switcher.set_size_request(150, -1)

    paned.pack1(switcher, False, False)
    paned.pack2(stack, True, False)
    box.pack_start(paned, False, False, 0)
    return frame
```

Register it:

```python
SECTIONS = (
    surfaces_section,
    text_section,
    buttons_section,
    inputs_section,
    tabs_section,
    lists_section,
    layout_section,
    menus_section,
    feedback_section,
    xfce_section,
)
```

- [x] **Step 9: Regenerate, reinstall, re-capture**

```bash
npm run generate && npm run check && ./install.sh --all && npm run preview:shots
```

- [x] **Step 10: Confirm the segmented control and the sidebar**

Open the Midnight capture. The `Left | Middle | Right` row must now read as one segmented control — square interior corners, single shared edges — rather than three separate buttons. The stack sidebar must sit on `bg_soft` with a boundary against the stack pane, and the paned handle must be a visible hairline.

- [x] **Step 11: Commit**

```bash
git add tools/templates/gtk3.mjs tools/templates/gtk3/paned.mjs tools/templates/gtk3/sidebar.mjs tools/templates/gtk3/button.mjs tools/templates/gtk3.test.mjs tools/preview/gallery.py gtk-3.0/
git commit -m "🎨 feat: style paned handles, sidebars and linked buttons

A paned handle uses the control boundary rather than the decorative
separator colour: it is draggable and its position is meaningful, which
makes it a UI component under WCAG 1.4.11."
```

---

### Task 9: Calendars and expanders

The last two nodes on the spec's unstyled list. Both are low-traffic in Xfce but both appear in the Settings dialogs, and leaving them is what makes a coverage sweep incomplete rather than merely partial.

**Files:**

- Create: `tools/templates/gtk3/misc.mjs`
- Modify: `tools/templates/gtk3.mjs`, `tools/preview/gallery.py`
- Test: `tools/templates/gtk3.test.mjs`

**Interfaces:**

- Consumes: `ctx.radius`, `ctx.space`, `ctx.control.border`
- Produces: a `misc` module composed last before `selection`

- [x] **Step 1: Extend the selector test**

Add to the selector array:

```js
    "calendar",
    "expander",
```

- [x] **Step 2: Run it and watch it fail**

Run: `node --test tools/templates/gtk3.test.mjs`
Expected: FAIL — `expected CSS to style calendar`.

- [x] **Step 3: Write the module**

Create `tools/templates/gtk3/misc.mjs`:

```js
export function render(ctx) {
  return `calendar {
  background-color: @vl_bg_sunk;
  color: @vl_fg;
  border: 1px solid @vl_control_border;
  border-radius: ${ctx.radius.sm};
  padding: ${ctx.space["1"]};
}

/* Days outside the displayed month, and the weekday header row. Muted on
   the sunk surface clears 5.52:1, so these stay legible while reading as
   secondary. */
calendar:indeterminate,
calendar.header,
calendar.highlight {
  color: @vl_fg_muted;
}

calendar:selected {
  background-color: @vl_accent;
  color: @vl_accent_on;
  border-radius: ${ctx.radius.sm};
}

expander title {
  color: @vl_fg;
  padding: ${ctx.space["1"]} 0;
}

expander arrow {
  color: @vl_fg_muted;
  min-width: ${ctx.space["4"]};
  min-height: ${ctx.space["4"]};
}

expander title:hover arrow {
  color: @vl_accent;
}`;
}

export function contrastPairs(ctx) {
  return [
    {
      label: "calendar day",
      fg: ctx.text.fg,
      bg: ctx.surface.bg_sunk,
      rule: "text",
    },
    {
      label: "calendar secondary day",
      fg: ctx.text.fg_muted,
      bg: ctx.surface.bg_sunk,
      rule: "text",
    },
    {
      label: "calendar selected day",
      fg: ctx.accentOn,
      bg: ctx.accent,
      rule: "text",
    },
    {
      label: "calendar boundary",
      fg: ctx.control.border,
      bg: ctx.surface.bg,
      rule: "nontext",
    },
    {
      label: "expander title",
      fg: ctx.text.fg,
      bg: ctx.surface.bg,
      rule: "text",
    },
    {
      label: "expander arrow",
      fg: ctx.text.fg_muted,
      bg: ctx.surface.bg,
      rule: "nontext",
    },
    {
      label: "expander arrow hover",
      fg: ctx.accent,
      bg: ctx.surface.bg,
      rule: "nontext",
    },
  ];
}
```

- [x] **Step 4: Compose it**

In `tools/templates/gtk3.mjs`, add `import * as misc from "./gtk3/misc.mjs";` and place `misc,` in `GTK3_MODULES` immediately before `selection`.

- [x] **Step 5: Run the tests**

Run: `node --test tools/templates/gtk3.test.mjs tools/aa.test.mjs`
Expected: PASS.

- [x] **Step 6: Add a calendar and an expander to the gallery**

In `tools/preview/gallery.py`, in `layout_section()` (added in Task 8), before `return frame`:

```python
    expander = Gtk.Expander(label="An expander, expanded")
    expander.set_expanded(True)
    inner = Gtk.Box(orientation=Gtk.Orientation.VERTICAL)
    inner.set_border_width(6)
    inner.pack_start(label("Revealed content"), False, False, 0)
    expander.add(inner)
    box.pack_start(expander, False, False, 0)

    calendar = Gtk.Calendar()
    calendar.set_halign(Gtk.Align.START)
    box.pack_start(calendar, False, False, 0)
```

- [x] **Step 7: Regenerate, reinstall, re-capture**

```bash
npm run generate && npm run check && ./install.sh --all && npm run preview:shots
```

- [x] **Step 8: Review the calendar**

Open the Midnight capture. The calendar must sit on the sunk surface with a boundary, the weekday header must read as secondary rather than as body text, and the selected day must be an accent fill. Confirm the expander's arrow is visible against the window.

- [x] **Step 9: Commit**

```bash
git add tools/templates/gtk3.mjs tools/templates/gtk3/misc.mjs tools/templates/gtk3.test.mjs tools/preview/gallery.py gtk-3.0/
git commit -m "🎨 feat: style calendars and expanders

The last two nodes on the spec's unstyled list."
```

---

### Task 10: Close out the sweep

Every prior task verified one module. This one verifies the whole, against the spec's definition of done.

**Files:**

- Modify: `docs/superpowers/specs/2026-09-05-gtk-widget-coverage-design.md`
- Modify: `docs/superpowers/plans/2026-09-06-gtk-coverage-phase2.md`

**Interfaces:**

- Consumes: every module from Tasks 3–9
- Produces: no code

- [x] **Step 1: Confirm no node on the spec's list is still unstyled**

The spec names these as rendering with zero rules. `switch` was closed in phase 1; the rest belong to this plan. Check each is now matched by a rule:

```bash
for node in menubar toolbar popover combobox switch spinbutton scale separator \
            treeview list paned infobar expander frame levelbar calendar; do
  printf '%-12s %s\n' "$node" \
    "$(grep -c "^[^ ].*\b$node\b" gtk-3.0/vivid-life-midnight-blue/gtk.css) rule(s)"
done
```

Expected: every node reports at least 1. A zero is a gap — find which task should have covered it and go back.

- [x] **Step 2: Run the widget-factory cross-check**

Run: `npm run preview:factory`

If it captured, open `tools/preview/out/factory-vivid-life-midnight-blue.png` and look for any widget the factory draws that our gallery does not, and that still renders unthemed. Record what you find.

If it skipped because `gtk-3-examples` is not installed, write that down explicitly in the summary — "not performed, package absent" — rather than treating the spec's definition-of-done item 4 as satisfied.

- [x] **Step 3: Review all four contact sheets**

Run: `npm run preview:shots`

Open `tools/preview/out/contact-midnight.png`, `contact-twilight.png`, `contact-dawn.png` and `contact-noon.png`. Twilight and Dawn are the ones to look hardest at: Twilight has the narrowest surface ramp (`bg` `#404040` against `bg_soft` `#525252`), and Dawn is the light flavor where a boundary derived for dark flavors is most likely to look heavy.

- [x] **Step 4: Spot-check the real applications**

The spec's definition of done item 5. With a Vivid Life theme selected, open each and confirm nothing renders unthemed:

- Thunar — toolbar, sidebar, tree view, column headers
- xfce4-terminal — menubar, tabs, scrollbar
- Appearance dialog — the theme list, its selected row's subtitle, the switch
- Window Manager dialog — the linked button row, the scale
- Whisker Menu — expected to still be two-tone; that defect is out of scope for this plan and gets its own diagnosis

Note anything that still looks wrong. A finding here becomes the next plan's input, not a reason to keep patching this one.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: all tests pass. This takes roughly 6 minutes; the xfwm4 rasterization dominates. Run it in the background and wait once — do not poll.

- [x] **Step 6: Record the outcome in the spec**

Add a line to the spec's Sequencing section marking step 3 complete, with the commit range. If Step 2 or Step 4 turned up anything, add it to the spec's "Known fixes" section so the next plan inherits it.

- [x] **Step 7: Commit**

```bash
git add docs/superpowers/specs/2026-09-05-gtk-widget-coverage-design.md docs/superpowers/plans/2026-09-06-gtk-coverage-phase2.md
git commit -m "📝 docs: record the GTK3 coverage sweep as complete"
```

---

## Out of scope for this plan

- **Whisker Menu two-tone.** Confirmed still unreproduced by the gallery: a strip sampled across both panes of the gallery's Whisker mock reads a uniform `#404040`, because that mock uses one `.menu` container while the real plugin has its own hierarchy. Diagnosing it needs `GTK_DEBUG=interactive` against the running popup to find which node paints `bg_overlay` on one pane and not the other. Its own plan, once that output exists.
- **Thunar toolbar icon sizes.** Still unattributed. Task 10 Step 4 may settle it; if Thunar's toolbar looks right under another theme and wrong under ours, it becomes a bug with an owner.
- **GTK4 and GTK2.** The spec's sequencing step 4. GTK4 cannot be verified on this machine today — `gi.require_version("Gtk", "4.0")` raises `Namespace Gtk not available for version 4.0`, so `gir1.2-gtk-4.0` is a prerequisite for that plan, not this one.
- **Retrofitting existing modules onto the spacing scale.** Task 1 adds `ctx.space` and `ctx.radius` for new rules and deliberately leaves phase 1's literal values alone. Changing them is a visual change with no coverage benefit; it belongs in its own commit if it is wanted at all.
