# GTK Widget Coverage — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking; `- [~]` marks a step whose verification was substituted, with the substitution quoted beneath it.

**Goal:** Put a verification harness, a per-widget module structure, and a generalized contrast gate behind the GTK3 stylesheet, then apply the three fixes that need no further diagnosis.

**Architecture:** `tools/templates/gtk3.mjs` becomes an index composing per-widget modules from `tools/templates/gtk3/`, each exporting `render(ctx)` and `contrastPairs(ctx)`. `aa.test.mjs` stops hardcoding GTK pairs and walks the modules instead. A GTK3 gallery written against the distribution Python renders every widget for headless per-flavor screenshots.

**Tech Stack:** Node 20 (ESM, `node --test`), `/usr/bin/python3` + PyGObject (GTK3), `xvfb-run`, ImageMagick.

**Spec:** `docs/superpowers/specs/2026-09-05-gtk-widget-coverage-design.md`

## Global Constraints

- Never hand-encode palette values. Colors come from `@vivid-life-theme/design-system` via `tools/lib/tokens.mjs`. Derived values must be computed from existing tokens by a documented rule.
- All 24 flavor × variant combinations must stay WCAG AA (4.5:1 text, 3:1 non-text).
- The Python interpreter is **`/usr/bin/python3`**, never `python3` from `PATH` — the Homebrew build on this machine has no `gi` module.
- Flavor order is time-based: Midnight, Twilight, Dawn, Noon. Variants capitalized: Red, Orange, Yellow, Green, Blue, Purple. No Cyan.
- Commit messages use Conventional Commits with gitmoji.
- Tasks 2–4 must not change generated output. `npm run check` must pass **without regenerating**, which is the proof the refactor was behavior-preserving.

---

### Task 1: Derive the control-boundary color

**Files:**

- Modify: `tools/lib/tokens.mjs`
- Test: `tools/lib/tokens.test.mjs`

**Interfaces:**

- Consumes: `flavorBlock(flavor)` from `tools/lib/tokens.mjs`, `contrastRatio(a, b)` from `tools/lib/contrast.mjs`
- Produces: `controlColors(flavorBlockOrName) -> { border: string, source: string }` where `border` is a `#rrggbb` hex and `source` is one of `"border.strong"`, `"text.fg_subtle"`, `"text.fg_muted"`

- [x] **Step 1: Write the failing test**

Append to `tools/lib/tokens.test.mjs`:

```js
import { controlColors } from "./tokens.mjs";
import { contrastRatio } from "./contrast.mjs";

test("controlColors picks the first candidate clearing 3:1 on every control surface", () => {
  // Expected per flavor, computed from the pinned token set:
  //   midnight  border.strong/#737373 and fg_subtle/#737373 both fail on
  //             bg_soft (2.19:1), so fg_muted wins.
  //   twilight  border.strong/#0a0a0a fails on bg (1.91:1); fg_subtle clears.
  //   dawn/noon border.strong clears everywhere.
  const expected = {
    midnight: { border: "#d4d4d4", source: "text.fg_muted" },
    twilight: { border: "#a3a3a3", source: "text.fg_subtle" },
    dawn: { border: "#404040", source: "border.strong" },
    noon: { border: "#737373", source: "border.strong" },
  };
  for (const [flavor, want] of Object.entries(expected)) {
    assert.deepEqual(controlColors(flavor), want, `flavor ${flavor}`);
  }
});

test("the derived control border clears 3:1 on bg, bg_soft and bg_overlay", () => {
  for (const flavor of ["midnight", "twilight", "dawn", "noon"]) {
    const b = flavorBlock(flavor);
    const { border } = controlColors(flavor);
    for (const surface of ["bg", "bg_soft", "bg_overlay"]) {
      const ratio = contrastRatio(border, b.surface[surface]);
      assert.ok(
        ratio >= 3,
        `${flavor} ${surface}: ${border} on ${b.surface[surface]} is ${ratio.toFixed(2)}:1`,
      );
    }
  }
});

test("controlColors accepts a flavor block as well as a flavor name", () => {
  assert.deepEqual(controlColors(flavorBlock("noon")), controlColors("noon"));
});
```

- [x] **Step 2: Run the test to verify it fails**

Run: `node --test tools/lib/tokens.test.mjs`
Expected: FAIL — `controlColors is not a function` / `does not provide an export named 'controlColors'`

- [x] **Step 3: Implement `controlColors`**

Add to `tools/lib/tokens.mjs`, importing `contrastRatio` at the top:

```js
import { contrastRatio } from "./contrast.mjs";
```

```js
// Surfaces a themed control can sit on or be filled with. A border only
// reads as a boundary if it separates from both the canvas behind the
// control and the control's own fill, so every one of these must clear.
const CONTROL_SURFACES = ["bg", "bg_soft", "bg_overlay"];
const NONTEXT_MIN = 3;

// The design system has no token whose contrast against a control surface
// is gated, and none of the border tokens clear WCAG 1.4.11 (3:1) on every
// flavor — border.default is literally identical to surface.bg_soft on
// Midnight (1.00:1). Upstream issue:
// https://github.com/vivid-life-theme/vivid-life-design-system/issues/15
// Until that lands, pick the first existing token that clears 3:1 against
// every control surface. Deterministic, invents no hex, and collapses to a
// direct token read once upstream ships one.
export function controlColors(flavorOrBlock) {
  const block =
    typeof flavorOrBlock === "string"
      ? flavorBlock(flavorOrBlock)
      : flavorOrBlock;
  const candidates = [
    ["border.strong", block.border.strong],
    ["text.fg_subtle", block.text.fg_subtle],
    ["text.fg_muted", block.text.fg_muted],
  ];
  for (const [source, border] of candidates) {
    const clearsAll = CONTROL_SURFACES.every(
      (surface) => contrastRatio(border, block.surface[surface]) >= NONTEXT_MIN,
    );
    if (clearsAll) return { border, source };
  }
  throw new Error(
    `No border candidate clears ${NONTEXT_MIN}:1 against ${CONTROL_SURFACES.join(", ")}`,
  );
}
```

- [x] **Step 4: Run the test to verify it passes**

Run: `node --test tools/lib/tokens.test.mjs`
Expected: PASS

- [x] **Step 5: Confirm generated output is untouched**

Run: `npm run check`
Expected: `Generated output matches tokens — no drift.`

- [x] **Step 6: Commit**

```bash
git add tools/lib/tokens.mjs tools/lib/tokens.test.mjs
git commit -m "✨ feat: derive a control-boundary color that clears WCAG 1.4.11

No design-system token clears 3:1 against the surfaces controls sit on —
border.default is identical to surface.bg_soft on Midnight. Pick the first
existing token that does, pending design-system#15."
```

---

### Task 2: Introduce the module system

**Files:**

- Create: `tools/templates/context.mjs`
- Create: `tools/templates/gtk3/_tokens.mjs`
- Create: `tools/templates/gtk3/base.mjs`
- Create: `tools/templates/gtk3/button.mjs`
- Modify: `tools/templates/gtk3.mjs`
- Test: `tools/templates/context.test.mjs`

**Interfaces:**

- Consumes: `controlColors` from Task 1
- Produces:
  - `buildContext(flavorBlock, accentHex, accentOnHex) -> { surface, text, border, semantic, state, accent, accentOn, control }`
  - Each module exports `render(ctx) -> string` (a CSS fragment, no trailing blank line)
  - `gtk3.mjs` keeps its existing `renderGtk3Css(flavorBlock, accentHex, accentOnHex) -> string` signature and additionally exports `GTK3_MODULES` (an ordered array of module namespace objects)

- [x] **Step 1: Write the failing test**

Create `tools/templates/context.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildContext } from "./context.mjs";
import { flavorBlock, resolveAccent, accentOn } from "../lib/tokens.mjs";

test("buildContext exposes the token groups and the derived control colors", () => {
  const ctx = buildContext(
    flavorBlock("midnight"),
    resolveAccent("midnight", "blue"),
    accentOn("midnight"),
  );
  assert.equal(ctx.surface.bg, "#171717");
  assert.equal(ctx.text.fg, "#f5f5f5");
  assert.equal(ctx.border.default, "#404040");
  assert.equal(ctx.accent, "#93c5fd");
  assert.equal(ctx.accentOn, "#171717");
  assert.equal(ctx.control.border, "#d4d4d4");
});
```

- [x] **Step 2: Run the test to verify it fails**

Run: `node --test tools/templates/context.test.mjs`
Expected: FAIL — cannot find module `./context.mjs`

- [x] **Step 3: Create the context builder**

Create `tools/templates/context.mjs`:

```js
import { controlColors } from "../lib/tokens.mjs";

// The single argument bag every template module receives. Modules must not
// reach past this into the raw token set — anything they need belongs here,
// so the contrast gate can see the same values the CSS does.
export function buildContext(flavorBlock, accentHex, accentOnHex) {
  return {
    surface: flavorBlock.surface,
    text: flavorBlock.text,
    border: flavorBlock.border,
    semantic: flavorBlock.semantic,
    state: flavorBlock.state,
    accent: accentHex,
    accentOn: accentOnHex,
    control: controlColors(flavorBlock),
  };
}
```

- [x] **Step 4: Run the test to verify it passes**

Run: `node --test tools/templates/context.test.mjs`
Expected: PASS

- [x] **Step 5: Extract the first three modules**

Create `tools/templates/gtk3/_tokens.mjs`. Copy the `@define-color` block from `gtk3.mjs` verbatim, adding **no** new colors yet (`vl_control_border` arrives in Task 8; adding it now would change generated output and break the byte-identical proof):

```js
export function render(ctx) {
  return `@define-color vl_bg ${ctx.surface.bg};
@define-color vl_bg_soft ${ctx.surface.bg_soft};
@define-color vl_bg_sunk ${ctx.surface.bg_sunk};
@define-color vl_bg_overlay ${ctx.surface.bg_overlay};
@define-color vl_fg ${ctx.text.fg};
@define-color vl_fg_muted ${ctx.text.fg_muted};
@define-color vl_fg_subtle ${ctx.text.fg_subtle};
@define-color vl_fg_disabled ${ctx.text.fg_disabled};
@define-color vl_border ${ctx.border.default};
@define-color vl_border_subtle ${ctx.border.subtle};
@define-color vl_border_strong ${ctx.border.strong};
@define-color vl_accent ${ctx.accent};
@define-color vl_accent_on ${ctx.accentOn};
@define-color vl_selection ${ctx.state.selection};
@define-color vl_success ${ctx.semantic.success};
@define-color vl_warning ${ctx.semantic.warning};
@define-color vl_danger ${ctx.semantic.danger};
@define-color vl_info ${ctx.semantic.info};`;
}
```

Create `tools/templates/gtk3/base.mjs` holding the `*` and `window, .background` rules, and `tools/templates/gtk3/button.mjs` holding every `button` rule — copied verbatim from `gtk3.mjs`, each `render()` returning the fragment with no leading or trailing blank line.

- [x] **Step 6: Turn `gtk3.mjs` into an index**

`gtk3.mjs` composes the extracted modules and keeps the not-yet-extracted CSS as one trailing literal. Joining with `\n\n` and appending a final `\n` is what preserves byte-identical output:

```js
import { buildContext } from "./context.mjs";
import * as tokens from "./gtk3/_tokens.mjs";
import * as base from "./gtk3/base.mjs";
import * as button from "./gtk3/button.mjs";

// Cascade order is part of the contract: base first so per-widget rules
// override it, selection last so it wins without relying on specificity —
// *:selected uses the universal selector, which contributes zero specificity
// and loses to any element or class selector regardless of source order.
export const GTK3_MODULES = [tokens, base, button];

export function renderGtk3Css(flavorBlock, accentHex, accentOnHex) {
  const ctx = buildContext(flavorBlock, accentHex, accentOnHex);
  const fragments = GTK3_MODULES.map((module) => module.render(ctx));
  return `/* Generated by tools/generate.mjs — do not edit by hand. */

${fragments.join("\n\n")}

${REMAINING_CSS}
`;
}
```

Keep `REMAINING_CSS` as a module-level template literal containing everything not yet extracted.

- [x] **Step 7: Prove the output did not change**

Run: `npm run check`
Expected: `Generated output matches tokens — no drift.`

**Do not run `npm run generate`.** `check` re-renders from the new modules and compares against the committed files; passing without regenerating is the proof the refactor was behavior-preserving. If it reports drift, the extraction changed whitespace — fix the fragment joining, do not regenerate to make it pass.

- [x] **Step 8: Run the full suite**

Run: `npm test`
Expected: all tests pass (this run takes roughly 16–20 minutes; the xfwm4 rasterization dominates)

- [x] **Step 9: Commit**

```bash
git add tools/templates/context.mjs tools/templates/context.test.mjs tools/templates/gtk3.mjs tools/templates/gtk3/
git commit -m "♻️ refactor: compose the gtk3 stylesheet from per-widget modules

Comprehensive widget coverage takes this file past 1500 lines. Split it the
way real themes are organized. Output is byte-identical — npm run check
passes without regenerating."
```

---

### Task 3: Migrate the remaining GTK3 rules into modules

**Files:**

- Create: `tools/templates/gtk3/entry.mjs`, `check-radio.mjs`, `notebook.mjs`, `menu.mjs`, `header-bars.mjs`, `scrollbar.mjs`, `progress.mjs`, `tooltip.mjs`, `selection.mjs`, `infobar.mjs`
- Modify: `tools/templates/gtk3.mjs`

**Interfaces:**

- Consumes: `buildContext` and the module shape from Task 2
- Produces: `GTK3_MODULES` covering every rule; `REMAINING_CSS` deleted

- [x] **Step 1: Extract each remaining rule group verbatim**

One module per group, each `render(ctx)` returning the existing CSS unchanged:

| Module            | Rules moved from `gtk3.mjs`                                 |
| ----------------- | ----------------------------------------------------------- |
| `entry.mjs`       | `entry`, `entry:focus`                                      |
| `check-radio.mjs` | `check, radio`, `check:checked, radio:checked`              |
| `notebook.mjs`    | `notebook > header`, `notebook > header tab`, `tab:checked` |
| `menu.mjs`        | `menu, .menu`, `menuitem`, `menuitem:hover`                 |
| `header-bars.mjs` | `headerbar`                                                 |
| `scrollbar.mjs`   | `scrollbar`, `scrollbar slider`, `slider:hover`             |
| `progress.mjs`    | `progressbar > trough`, `> progress`                        |
| `tooltip.mjs`     | `tooltip`                                                   |
| `selection.mjs`   | `selection`, `*:selected`, `*:selected label/.dim-label`    |
| `infobar.mjs`     | `.warning`, `.error`, `.success`                            |

Preserve every existing comment, including the scrollbar's WCAG 1.4.11 note and the selection block's rationale.

- [x] **Step 2: Update the index and delete `REMAINING_CSS`**

```js
export const GTK3_MODULES = [
  tokens,
  base,
  button,
  entry,
  checkRadio,
  notebook,
  menu,
  headerBars,
  scrollbar,
  progress,
  tooltip,
  infobar,
  selection,
];
```

`selection` stays last — see the cascade comment from Task 2.

- [x] **Step 3: Prove the output did not change**

Run: `npm run check`
Expected: `Generated output matches tokens — no drift.` Again, do not regenerate.

- [x] **Step 4: Run the GTK3 template tests**

Run: `node --test tools/templates/gtk3.test.mjs`
Expected: PASS — the existing tests assert on `renderGtk3Css` output, whose signature and result are unchanged

- [x] **Step 5: Commit**

```bash
git add tools/templates/gtk3.mjs tools/templates/gtk3/
git commit -m "♻️ refactor: finish the gtk3 module split

Every rule now lives in a per-widget module. Output still byte-identical."
```

---

### Task 4: Gate the module registry

**Files:**

- Test: `tools/templates/gtk3.test.mjs`

**Interfaces:**

- Consumes: `GTK3_MODULES` from Task 3
- Produces: no new exports

- [x] **Step 1: Write the failing test**

A module file that exists but is never composed produces no CSS and no error — exactly the silent gap this plan exists to prevent. Append to `tools/templates/gtk3.test.mjs`:

```js
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GTK3_MODULES } from "./gtk3.mjs";

test("every module file in gtk3/ is composed by the index", async () => {
  const dir = fileURLToPath(new URL("./gtk3/", import.meta.url));
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".mjs") && !f.endsWith(".test.mjs"));
  const composed = new Set(
    await Promise.all(
      GTK3_MODULES.map(async (m) => {
        for (const f of files) {
          if ((await import(path.join(dir, f))).render === m.render) return f;
        }
        return null;
      }),
    ),
  );
  for (const file of files) {
    assert.ok(
      composed.has(file),
      `gtk3/${file} exists but is not in GTK3_MODULES`,
    );
  }
});

test("every composed module exports a render function", () => {
  for (const module of GTK3_MODULES) {
    assert.equal(typeof module.render, "function");
  }
});
```

- [x] **Step 2: Run it and confirm it passes against the current modules**

Run: `node --test tools/templates/gtk3.test.mjs`
Expected: PASS

- [x] **Step 3: Verify the test actually catches an orphan**

Create a throwaway `tools/templates/gtk3/orphan.mjs` containing `export function render() { return ""; }`, re-run the test, confirm it FAILS with `gtk3/orphan.mjs exists but is not in GTK3_MODULES`, then delete the file and confirm it passes again.

- [x] **Step 4: Commit**

```bash
git add tools/templates/gtk3.test.mjs
git commit -m "✅ test: fail when a gtk3 module is never composed"
```

---

### Task 5: Generalize the contrast gate

**Files:**

- Modify: every module in `tools/templates/gtk3/`
- Modify: `tools/aa.test.mjs`

**Interfaces:**

- Consumes: `buildContext`, `GTK3_MODULES`
- Produces: each module additionally exports `contrastPairs(ctx) -> Array<{ label, fg, bg, rule, exempt? }>` where `rule` is `"text"` or `"nontext"`; modules emitting no color pairs may omit the export

- [x] **Step 1: Add `contrastPairs` to each module**

Port the pairs `aa.test.mjs` asserts today into the module that emits them. `button.mjs`, for example:

```js
export function contrastPairs(ctx) {
  return [
    {
      label: "button label",
      fg: ctx.text.fg,
      bg: ctx.surface.bg_soft,
      rule: "text",
    },
    {
      label: "button hover label",
      fg: ctx.text.fg,
      bg: shade(ctx.surface.bg_soft, 1.08),
      rule: "text",
    },
    {
      label: "accent button label",
      fg: ctx.accentOn,
      bg: ctx.accent,
      rule: "text",
    },
    {
      label: "destructive button label",
      fg: ctx.accentOn,
      bg: ctx.semantic.danger,
      rule: "text",
    },
    {
      label: "disabled button label",
      fg: ctx.text.fg_disabled,
      bg: ctx.surface.bg_soft,
      rule: "text",
      exempt: "WCAG 1.4.3 — text in an inactive user-interface component",
    },
  ];
}
```

Move the existing `shade()` helper out of `aa.test.mjs` into `tools/lib/contrast.mjs` and export it, so modules and tests share one implementation.

- [x] **Step 2: Rewrite the GTK half of `aa.test.mjs`**

Replace the GTK entries in `pairsFor()` with a module walk. Keep the xfwm4 entries as the explicit list they are today — those templates are not being split:

```js
function gtkPairsFor(flavor, variant) {
  const ctx = buildContext(
    flavorBlock(flavor),
    resolveAccent(flavor, variant),
    accentOn(flavor),
  );
  return GTK3_MODULES.flatMap((m) =>
    m.contrastPairs ? m.contrastPairs(ctx) : [],
  );
}

for (const { flavor, variant } of allCombinations()) {
  test(`WCAG — ${flavor} ${variant}`, () => {
    for (const pair of [
      ...gtkPairsFor(flavor, variant),
      ...xfwm4PairsFor(flavor, variant),
    ]) {
      if (pair.exempt) continue;
      const min = pair.rule === "nontext" ? AA_NONTEXT : AA;
      const ratio = contrastRatio(pair.fg, pair.bg);
      assert.ok(
        ratio >= min,
        `${pair.label}: ${pair.fg} on ${pair.bg} is ${ratio.toFixed(2)}:1, below ${min}:1`,
      );
    }
  });
}

test("every exemption is still needed", () => {
  for (const { flavor, variant } of allCombinations()) {
    for (const pair of gtkPairsFor(flavor, variant)) {
      if (!pair.exempt) continue;
      const min = pair.rule === "nontext" ? AA_NONTEXT : AA;
      assert.ok(
        contrastRatio(pair.fg, pair.bg) < min,
        `${pair.label} (${flavor} ${variant}) now clears ${min}:1 — drop the exemption: ${pair.exempt}`,
      );
    }
  }
});
```

Delete the old standalone `fg_disabled` test — the exemption test above supersedes it and covers all 24 combinations rather than Midnight alone.

- [x] **Step 3: Add a test that the gate has real coverage**

A module walk that silently returns nothing would pass vacuously:

```js
test("the module walk yields pairs for every flavor and variant", () => {
  for (const { flavor, variant } of allCombinations()) {
    assert.ok(
      gtkPairsFor(flavor, variant).length >= 15,
      `${flavor} ${variant} yielded too few pairs`,
    );
  }
});
```

- [x] **Step 4: Run the suite**

Run: `node --test tools/aa.test.mjs`
Expected: PASS, with 24 `WCAG — <flavor> <variant>` tests plus the exemption and coverage tests

- [x] **Step 5: Commit**

```bash
git add tools/aa.test.mjs tools/lib/contrast.mjs tools/templates/gtk3/
git commit -m "✅ test: gate every contrast pair the gtk3 modules emit

The old suite asserted ~20 hardcoded text pairs and exactly one non-text
pair, which is why an invisible button border shipped. Modules now declare
their own pairs and the gate walks all of them across all 24 combinations."
```

---

### Task 6: Build the widget gallery

**Files:**

- Create: `tools/preview/gallery.py`
- Modify: `package.json`, `.gitignore`

**Interfaces:**

- Consumes: nothing from earlier tasks (runs against installed themes)
- Produces: `npm run preview -- --theme <name>`; `gallery.py --theme <name> [--screenshot <path>]`

- [x] **Step 1: Write the gallery**

Create `tools/preview/gallery.py` with `#!/usr/bin/python3` as the shebang. It must fail loudly, not with a bare traceback, when the bindings are missing:

```python
#!/usr/bin/python3
"""Renders every themed GTK3 widget in one window, for visual review.

Must run under /usr/bin/python3 — the Homebrew python3 on PATH has no gi.
"""
import argparse
import sys

try:
    import gi
    gi.require_version("Gtk", "3.0")
    from gi.repository import Gtk, GLib
except (ImportError, ValueError):
    sys.exit(
        "gallery.py needs PyGObject with GTK 3 bindings.\n"
        "Run it with /usr/bin/python3, not the python3 on PATH."
    )
```

Build sections mirroring `preview/01-kitchen-sink.html` — surfaces, text layers, buttons (normal/hover/active/disabled/suggested/destructive), inputs (entry, spinbutton, combobox, switch, check, radio, scale), tabs, lists (treeview with column headers, listbox rows, selected rows), menus (menubar with a populated dropdown, popover), and feedback (progressbar, levelbar, infobar, tooltip). Add an Xfce section with a two-pane popup reproducing the Whisker Menu layout.

`--screenshot PATH` renders, waits for one frame via `GLib.idle_add`, writes the PNG with `Gdk.pixbuf_get_from_window`, and quits.

- [~] **Step 2: Verify it runs interactively**

Run: `/usr/bin/python3 tools/preview/gallery.py --theme vivid-life-midnight-blue`
Expected: a window opens showing every section

> Substituted: verified headlessly under `xvfb-run --screenshot` instead of
> interactively, and the capture was reviewed section by section.

- [x] **Step 3: Probe that `GTK_THEME` applies headlessly**

This is the spec's flagged risk — settle it before building the capture loop on top:

```bash
for t in vivid-life-midnight-blue vivid-life-noon-red; do
  xvfb-run -a env GTK_THEME=$t /usr/bin/python3 tools/preview/gallery.py \
    --theme $t --screenshot /tmp/probe-$t.png
done
magick compare -metric AE /tmp/probe-vivid-life-midnight-blue.png \
  /tmp/probe-vivid-life-noon-red.png null: 2>&1
```

Expected: a large non-zero pixel difference. If it reports 0, `GTK_THEME` is not applying — fall back to writing a temporary `settings.ini` with `gtk-theme-name` and pointing `XDG_CONFIG_HOME` at it for the run, as the spec's risk section describes.

- [x] **Step 4: Wire up the npm script and ignore the output directory**

Add to `package.json`: `"preview": "/usr/bin/python3 tools/preview/gallery.py"`. Add `tools/preview/out/` to `.gitignore`.

- [x] **Step 5: Commit**

```bash
git add tools/preview/gallery.py package.json .gitignore
git commit -m "✨ feat: add a GTK3 widget gallery for visual review

Renders every themed widget in one window so a coverage gap is visible in
one screenshot instead of surfacing as a bug report from a real app."
```

---

### Task 7: Capture per-flavor contact sheets

**Files:**

- Create: `tools/preview/shots.sh`
- Modify: `package.json`

**Interfaces:**

- Consumes: `gallery.py --screenshot` from Task 6
- Produces: `npm run preview:shots`; PNGs at `tools/preview/out/<theme>.png`; contact sheets at `tools/preview/out/contact-<flavor>.png`

- [x] **Step 1: Write the capture script**

`tools/preview/shots.sh` loops all 24 themes, captures each under `xvfb-run`, then montages one contact sheet per flavor with the six variants labelled. It must skip cleanly with a clear message if `xvfb-run` or `magick` is absent, so a fresh clone never fails on missing optional tooling.

Register it in the same step, so the next step has something to run — add to `package.json`:

```json
"preview:shots": "sh tools/preview/shots.sh"
```

Mark the script executable: `chmod +x tools/preview/shots.sh`

- [x] **Step 2: Run it**

Run: `npm run preview:shots`
Expected: 24 PNGs plus 4 contact sheets in `tools/preview/out/`

- [x] **Step 3: Review the Midnight sheet**

Open `tools/preview/out/contact-midnight.png`. Confirm the unstyled widgets the spec names are visibly unstyled — `switch` especially should show as a bare tick and circle. This is the baseline the next tasks are measured against.

- [x] **Step 4: Commit**

```bash
git add tools/preview/shots.sh package.json
git commit -m "✨ feat: render per-flavor contact sheets of the widget gallery"
```

---

### Task 8: Apply the control boundary

**Files:**

- Modify: `tools/templates/gtk3/_tokens.mjs`, `button.mjs`, `entry.mjs`, `check-radio.mjs`, `menu.mjs`, `tooltip.mjs`
- Regenerate: `gtk-3.0/*/gtk.css`

**Interfaces:**

- Consumes: `ctx.control.border` from Task 1, `contrastPairs` from Task 5
- Produces: `@vl_control_border` available to every GTK3 module

- [x] **Step 1: Add the failing contrast pair first**

In `button.mjs`, add the boundary pair before changing any CSS:

```js
{ label: "button boundary", fg: ctx.border.default, bg: ctx.surface.bg_soft, rule: "nontext" },
```

- [x] **Step 2: Run the gate and watch it fail**

Run: `node --test tools/aa.test.mjs`
Expected: FAIL — `button boundary: #404040 on #404040 is 1.00:1, below 3:1` on Midnight. This is the defect reproduced as a test.

- [x] **Step 3: Emit and use the derived color**

Add to `_tokens.mjs`: `@define-color vl_control_border ${ctx.control.border};`. Switch `border: 1px solid @vl_border` to `@vl_control_border` in `button.mjs`, `entry.mjs`, `check-radio.mjs`, `menu.mjs` and `tooltip.mjs`. Update the pair from Step 1 to `fg: ctx.control.border`.

- [x] **Step 4: Run the gate again**

Run: `node --test tools/aa.test.mjs`
Expected: PASS across all 24

- [x] **Step 5: Regenerate and review**

Run: `npm run generate && npm run check && npm run preview:shots`

Open `tools/preview/out/contact-midnight.png`. Midnight resolves to `text.fg_muted` (`#d4d4d4`), the lightest of the candidates — the spec flags that this may read as heavier than intended. If borders look like a wireframe rather than a themed control, do **not** relax the 3:1 requirement; add an intermediate candidate to the chain in `controlColors` and re-run.

- [x] **Step 6: Check whether button margins are still needed**

The original report was that buttons "have no space around them". Look at the Fensterverwaltung-style button row in the gallery now that borders are visible. Only if adjacent buttons still read as one mass, add `margin: 2px` to `button` — otherwise skip it, since the invisible border was the actual cause.

- [x] **Step 7: Commit**

```bash
git add tools/templates/gtk3/ gtk-3.0/
git commit -m "🎨 fix: give controls a boundary that clears WCAG 1.4.11

border.default was identical to surface.bg_soft on Midnight, so every
button, entry and menu had a 1.00:1 — invisible — border. Use the derived
control boundary instead, gated by the contrast suite."
```

---

### Task 9: Style the switch

**Files:**

- Create: `tools/templates/gtk3/switch.mjs`
- Modify: `tools/templates/gtk3.mjs`
- Regenerate: `gtk-3.0/*/gtk.css`

**Interfaces:**

- Consumes: `ctx.control.border`, the module shape from Task 2
- Produces: a `switch` module composed after `check-radio`

- [x] **Step 1: Write the module**

```js
export function render() {
  return `switch {
  background-color: @vl_bg_sunk;
  border: 1px solid @vl_control_border;
  border-radius: 14px;
  min-width: 40px;
  min-height: 20px;
}

switch:checked {
  background-color: @vl_accent;
  border-color: @vl_accent;
}

switch slider {
  background-color: @vl_fg_muted;
  border-radius: 50%;
  min-width: 16px;
  min-height: 16px;
  margin: 1px;
}

switch:checked slider {
  background-color: @vl_accent_on;
}

switch:disabled {
  color: @vl_fg_disabled;
}`;
}

export function contrastPairs(ctx) {
  return [
    {
      label: "switch slider on trough",
      fg: ctx.text.fg_muted,
      bg: ctx.surface.bg_sunk,
      rule: "nontext",
    },
    {
      label: "switch slider when checked",
      fg: ctx.accentOn,
      bg: ctx.accent,
      rule: "nontext",
    },
    {
      label: "switch trough boundary",
      fg: ctx.control.border,
      bg: ctx.surface.bg,
      rule: "nontext",
    },
  ];
}
```

- [x] **Step 2: Compose it and run the gate**

Add `switch` to `GTK3_MODULES` after `checkRadio`.
Run: `node --test tools/aa.test.mjs`
Expected: PASS

- [x] **Step 3: Regenerate and verify visually**

Run: `npm run generate && npm run check && npm run preview:shots`
Open a contact sheet and confirm the switch now renders as a filled pill with a round slider, distinguishable between on and off states.

- [x] **Step 4: Commit**

```bash
git add tools/templates/gtk3.mjs tools/templates/gtk3/switch.mjs gtk-3.0/
git commit -m "🎨 feat: style the GTK3 switch

The template had no switch rules at all, so GTK drew a bare tick and circle
where the Appearance dialog's Xfwm4 toggle should be."
```

---

### Task 10: Narrow the selected-label rule

**Files:**

- Modify: `tools/templates/gtk3/selection.mjs`
- Regenerate: `gtk-3.0/*/gtk.css`

**Interfaces:**

- Consumes: the `selection` module from Task 3
- Produces: no new exports

- [x] **Step 1: Narrow the selector**

The rule shipped in `ee09a97` sets `color` on _every_ label under a selected row, which also flattens `.warning`, `.error` and `.success` text inside selected rows. Restrict it to the dim/subtitle labels it was written for:

```css
*:selected .dim-label,
*:selected .subtitle {
  color: @vl_accent_on;
  opacity: 1;
}
```

Update the comment to record the narrowed intent: subtitle text carries `.dim-label`'s baked-in `opacity: 0.55`, which does not follow the row's selected state; semantic label colors are deliberately left alone so they stay meaningful when selected.

- [~] **Step 2: Regenerate and verify**

Run: `npm run generate && npm run check`
Then open the Appearance dialog and confirm the `Gtk3, Gtk2, Xfwm4` subtitle under a selected theme name is still fully legible against the accent fill.

> Substituted: confirmed against the gallery's treeview and listbox selected
> rows, which reproduce the same `.dim-label` subtitle, not the real dialog.

- [x] **Step 3: Run the full suite**

Run: `npm test`
Expected: all tests pass

> Result: 116 tests, 116 pass, 0 fail (396s).

- [x] **Step 4: Commit**

```bash
git add tools/templates/gtk3/selection.mjs gtk-3.0/
git commit -m "🎨 fix: stop flattening semantic labels in selected rows

The broad *:selected label rule also recolored .warning/.error/.success
text. Narrow it to the dim/subtitle labels it was written for."
```

---

## Out of scope for this plan

- **Whisker Menu two-tone.** Needs `GTK_DEBUG=interactive` against the running popup to identify which node paints `bg_overlay` on one pane and not the other. Writing CSS before that diagnosis would be guessing.
- **Thunar toolbar icon sizes.** Not yet attributed to the theme; confirm by switching to Sweet-Dark first.
- **The coverage sweep** (`toolbar`, `popover`, `combobox`, `spinbutton`, `treeview` headers, `separator`, `paned`, `scale`, `.linked`, `.sidebar`, `frame`, `expander`, `levelbar`, `calendar`) and **GTK4/GTK2**. Both get their own plans once the contact sheets from Task 7 show what the gaps actually look like.
