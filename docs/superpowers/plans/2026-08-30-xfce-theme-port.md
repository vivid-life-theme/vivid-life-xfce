# Vivid Life Xfce Theme Port Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate GTK2/GTK3/GTK4 + Xfwm4 theme files for all 24 Vivid Life flavor×variant combinations from the `@vivid-life-theme/design-system` npm package, and ship a POSIX-shell installer with auto-detection.

**Architecture:** A Node.js generator (`tools/generate.mjs` + per-target template modules) reads tokens from the pinned npm dependency and writes 96 static theme directories into the repo. A dependency-free `install.sh` copies the pre-built directories a user selects into `~/.themes/`.

**Tech Stack:** Node.js >=20 (built-in `node:test` runner, ESM), `rsvg-convert` (maintainer-only, for Xfwm4 button PNGs), POSIX `/bin/sh` for the installer, `shellcheck` for installer linting.

**Spec:** `docs/superpowers/specs/2026-08-30-xfce-theme-port-design.md`

## Deviation from spec

The spec's architecture diagram lists `xfwm4/vivid-life-<flavor>-<variant>/theme.xml`. Xfwm4 has no XML theme format — its themes are a `themerc` key-value file plus PNG assets. This plan uses `themerc`. Everything else in the spec is implemented as written.

## Global Constraints

- Tokens are read only from `@vivid-life-theme/design-system` (pinned exact version in `package.json`) — never re-derived or hand-copied.
- Accent color resolution: `palette[variant][String(accent_shade[flavor][variant])]`.
- Flavor names: `midnight`, `twilight`, `dawn`, `noon` (time order). Variant names: `red`, `orange`, `yellow`, `green`, `blue`, `purple`.
- Theme directory name for any (flavor, variant): `vivid-life-<flavor>-<variant>`.
- No icons or fonts are bundled in this repo.
- `install.sh` must run with no dependency beyond POSIX `/bin/sh` + coreutils — no Node, no npm, no network access at install time.
- End-user install location: `~/.themes/` only (no system-wide install in v1).

---

## File Structure

```text
package.json                          pins @vivid-life-theme/design-system, node engines >=20
tools/
  lib/
    tokens.mjs                        token access + accent resolution
    paths.mjs                         theme directory naming/paths
    rasterize.mjs                     rsvg-convert wrapper
  templates/
    gtk3.mjs                          GTK3 gtk.css generator
    gtk4.mjs                          GTK4 gtk.css generator
    gtk2.mjs                          GTK2 gtkrc generator
    xfwm4.mjs                         Xfwm4 themerc + button SVG generator
  generate.mjs                        orchestrator, --check flag
  *.test.mjs                          one test file per module above
gtk-2.0/vivid-life-<flavor>-<variant>/gtkrc            (24, generated)
gtk-3.0/vivid-life-<flavor>-<variant>/gtk.css          (24, generated)
gtk-4.0/vivid-life-<flavor>-<variant>/gtk.css          (24, generated)
xfwm4/vivid-life-<flavor>-<variant>/{themerc,*.png}    (24, generated)
install.sh                            end-user installer
README.md                             usage + icon/font recommendations
```

---

### Task 1: Project scaffolding and the design-system dependency

**Files:**

- Create: `package.json`
- Modify: `.gitignore` (add `node_modules/`)

**Interfaces:**

- Produces: an installed `node_modules/@vivid-life-theme/design-system` importable as `@vivid-life-theme/design-system` from any `tools/**/*.mjs` file.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "vivid-life-xfce",
  "version": "0.1.0",
  "private": true,
  "description": "Vivid Life Theme port for Xfce (GTK2/GTK3/GTK4 + Xfwm4) with an auto-detecting installer.",
  "type": "module",
  "engines": {
    "node": ">=20"
  },
  "scripts": {
    "test": "node --test tools/",
    "generate": "node tools/generate.mjs",
    "check": "node tools/generate.mjs --check"
  },
  "dependencies": {
    "@vivid-life-theme/design-system": "0.6.0"
  },
  "license": "MIT"
}
```

- [ ] **Step 2: Install the dependency**

Run: `npm install`
Expected: `node_modules/@vivid-life-theme/design-system/` exists, `package-lock.json` created.

- [ ] **Step 3: Add `node_modules/` to `.gitignore`**

Append to the existing `.gitignore`:

```text
node_modules/
```

- [ ] **Step 4: Verify the package resolves from Node**

Run: `node -e "import('@vivid-life-theme/design-system').then(m => console.log(Object.keys(m.default ?? m).slice(0,5)))"`
Expected: prints an array of top-level token keys (e.g. `[ 'meta', 'palette', 'variant_hues', 'accent_shade', 'flavors' ]`), no error.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json .gitignore
git commit -m "🔧 chore: add npm dependency on @vivid-life-theme/design-system"
```

---

### Task 2: Token access library

**Files:**

- Create: `tools/lib/tokens.mjs`
- Test: `tools/lib/tokens.test.mjs`

**Interfaces:**

- Consumes: `@vivid-life-theme/design-system` default export (the resolved token object — `meta`, `palette`, `variant_hues`, `accent_shade`, `flavors`, `typography`, `iconography`, per the upstream README's documented shape).
- Produces (used by Tasks 3-9):
  - `FLAVORS: string[]` — `['midnight', 'twilight', 'dawn', 'noon']`
  - `VARIANTS: string[]` — `['red', 'orange', 'yellow', 'green', 'blue', 'purple']`
  - `allCombinations(): Array<{ flavor: string, variant: string }>` — all 24 pairs
  - `flavorBlock(flavor: string): object` — `tokens.flavors[flavor]`, throws on unknown flavor
  - `resolveAccent(flavor: string, variant: string): string` — hex color
  - `accentOn(flavor: string): string` — hex color (dark text on dark flavors' bright accents, light text on light flavors' deep accents)
  - `rawTokens: object` — the full token object, for modules that need fields not covered above (e.g. Task 11's icon recommendations)

- [ ] **Step 1: Write the failing test**

```js
// tools/lib/tokens.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FLAVORS,
  VARIANTS,
  allCombinations,
  flavorBlock,
  resolveAccent,
  accentOn,
} from "./tokens.mjs";

test("FLAVORS is in time order", () => {
  assert.deepEqual(FLAVORS, ["midnight", "twilight", "dawn", "noon"]);
});

test("VARIANTS excludes cyan", () => {
  assert.deepEqual(VARIANTS, [
    "red",
    "orange",
    "yellow",
    "green",
    "blue",
    "purple",
  ]);
});

test("allCombinations returns all 24 pairs", () => {
  const combos = allCombinations();
  assert.equal(combos.length, 24);
  assert.deepEqual(combos[0], { flavor: "midnight", variant: "red" });
  assert.deepEqual(combos.at(-1), { flavor: "noon", variant: "purple" });
});

test("flavorBlock returns the flavor object", () => {
  const midnight = flavorBlock("midnight");
  assert.equal(midnight.label, "Midnight");
  assert.equal(midnight.type, "dark");
  assert.ok(midnight.surface.bg);
});

test("flavorBlock throws on unknown flavor", () => {
  assert.throws(() => flavorBlock("nope"), /Unknown flavor/);
});

test("resolveAccent matches the documented midnight/purple shade (300)", () => {
  // accent_shade.midnight.purple === 300 per tokens.json
  assert.equal(resolveAccent("midnight", "purple"), "#d8b4fe");
});

test("resolveAccent matches the documented dawn/red shade (900)", () => {
  // accent_shade.dawn.red === 900 per tokens.json
  assert.equal(resolveAccent("dawn", "red"), "#7f1d1d");
});

test("accentOn is dark text for dark flavors, light text for light flavors", () => {
  assert.equal(accentOn("midnight"), "#171717");
  assert.equal(accentOn("twilight"), "#171717");
  assert.equal(accentOn("dawn"), "#f5f5f5");
  assert.equal(accentOn("noon"), "#f5f5f5");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tools/lib/tokens.test.mjs`
Expected: FAIL — `tools/lib/tokens.mjs` does not exist (module not found).

- [ ] **Step 3: Write the implementation**

```js
// tools/lib/tokens.mjs
import designSystem from "@vivid-life-theme/design-system";

const tokens = designSystem.default ?? designSystem;

export const FLAVORS = ["midnight", "twilight", "dawn", "noon"];
export const VARIANTS = ["red", "orange", "yellow", "green", "blue", "purple"];

export function allCombinations() {
  const combos = [];
  for (const flavor of FLAVORS) {
    for (const variant of VARIANTS) {
      combos.push({ flavor, variant });
    }
  }
  return combos;
}

export function flavorBlock(flavor) {
  const block = tokens.flavors[flavor];
  if (!block) {
    throw new Error(`Unknown flavor: ${flavor}`);
  }
  return block;
}

export function resolveAccent(flavor, variant) {
  const shade = tokens.accent_shade[flavor][variant];
  return tokens.palette[variant][String(shade)];
}

export function accentOn(flavor) {
  const { type } = flavorBlock(flavor);
  return type === "dark"
    ? tokens.palette.gray["900"]
    : tokens.palette.gray["100"];
}

export const rawTokens = tokens;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tools/lib/tokens.test.mjs`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add tools/lib/tokens.mjs tools/lib/tokens.test.mjs
git commit -m "✨ feat: add token access library"
```

---

### Task 3: Theme naming and path helpers

**Files:**

- Create: `tools/lib/paths.mjs`
- Test: `tools/lib/paths.test.mjs`

**Interfaces:**

- Consumes: nothing (pure string/path functions).
- Produces (used by Task 9):
  - `TARGETS: string[]` — `['gtk-2.0', 'gtk-3.0', 'gtk-4.0', 'xfwm4']`
  - `themeDirName(flavor: string, variant: string): string` — `vivid-life-<flavor>-<variant>`
  - `targetOutputDir(outputRoot: string, target: string, flavor: string, variant: string): string` — `path.join(outputRoot, target, themeDirName(flavor, variant))`

- [ ] **Step 1: Write the failing test**

```js
// tools/lib/paths.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { TARGETS, themeDirName, targetOutputDir } from "./paths.mjs";

test("TARGETS lists all four ports", () => {
  assert.deepEqual(TARGETS, ["gtk-2.0", "gtk-3.0", "gtk-4.0", "xfwm4"]);
});

test("themeDirName joins flavor and variant", () => {
  assert.equal(
    themeDirName("midnight", "purple"),
    "vivid-life-midnight-purple",
  );
});

test("targetOutputDir builds the full path", () => {
  const result = targetOutputDir("/tmp/out", "gtk-3.0", "dawn", "blue");
  assert.equal(
    result,
    path.join("/tmp/out", "gtk-3.0", "vivid-life-dawn-blue"),
  );
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tools/lib/paths.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```js
// tools/lib/paths.mjs
import path from "node:path";

export const TARGETS = ["gtk-2.0", "gtk-3.0", "gtk-4.0", "xfwm4"];

export function themeDirName(flavor, variant) {
  return `vivid-life-${flavor}-${variant}`;
}

export function targetOutputDir(outputRoot, target, flavor, variant) {
  return path.join(outputRoot, target, themeDirName(flavor, variant));
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tools/lib/paths.test.mjs`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add tools/lib/paths.mjs tools/lib/paths.test.mjs
git commit -m "✨ feat: add theme naming and path helpers"
```

---

### Task 4: GTK3 stylesheet template

**Files:**

- Create: `tools/templates/gtk3.mjs`
- Test: `tools/templates/gtk3.test.mjs`

**Interfaces:**

- Consumes: `flavorBlock(flavor)` shape from Task 2 (`{ surface, text, border, state, semantic }`), `resolveAccent`/`accentOn` string outputs from Task 2.
- Produces (used by Task 9): `renderGtk3Css(flavorBlock: object, accentHex: string, accentOnHex: string): string` — full `gtk.css` file content.

- [ ] **Step 1: Write the failing test**

```js
// tools/templates/gtk3.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { renderGtk3Css } from "./gtk3.mjs";
import { flavorBlock, resolveAccent, accentOn } from "../lib/tokens.mjs";

test("renderGtk3Css embeds the flavor surface/text colors", () => {
  const midnight = flavorBlock("midnight");
  const css = renderGtk3Css(
    midnight,
    resolveAccent("midnight", "purple"),
    accentOn("midnight"),
  );
  assert.match(css, /@define-color vl_bg #171717;/);
  assert.match(css, /@define-color vl_fg #f5f5f5;/);
});

test("renderGtk3Css embeds the resolved accent for the variant", () => {
  const midnight = flavorBlock("midnight");
  const css = renderGtk3Css(
    midnight,
    resolveAccent("midnight", "purple"),
    accentOn("midnight"),
  );
  assert.match(css, /@define-color vl_accent #d8b4fe;/);
  assert.match(css, /@define-color vl_accent_on #171717;/);
});

test("renderGtk3Css styles core widgets", () => {
  const dawn = flavorBlock("dawn");
  const css = renderGtk3Css(
    dawn,
    resolveAccent("dawn", "blue"),
    accentOn("dawn"),
  );
  for (const selector of [
    "button",
    "entry",
    "headerbar",
    "notebook > header",
    "scrollbar",
    "progressbar",
    "tooltip",
    "menuitem",
  ]) {
    assert.ok(css.includes(selector), `expected CSS to style ${selector}`);
  }
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tools/templates/gtk3.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```js
// tools/templates/gtk3.mjs
export function renderGtk3Css(flavorBlock, accentHex, accentOnHex) {
  const { surface, text, border, semantic } = flavorBlock;

  return `/* Generated by tools/generate.mjs — do not edit by hand. */

@define-color vl_bg ${surface.bg};
@define-color vl_bg_soft ${surface.bg_soft};
@define-color vl_bg_sunk ${surface.bg_sunk};
@define-color vl_bg_overlay ${surface.bg_overlay};
@define-color vl_fg ${text.fg};
@define-color vl_fg_muted ${text.fg_muted};
@define-color vl_fg_subtle ${text.fg_subtle};
@define-color vl_fg_disabled ${text.fg_disabled};
@define-color vl_border ${border.default};
@define-color vl_border_subtle ${border.subtle};
@define-color vl_border_strong ${border.strong};
@define-color vl_accent ${accentHex};
@define-color vl_accent_on ${accentOnHex};
@define-color vl_success ${semantic.success};
@define-color vl_warning ${semantic.warning};
@define-color vl_danger ${semantic.danger};
@define-color vl_info ${semantic.info};

* {
  outline-color: alpha(@vl_accent, 0.5);
}

window,
.background {
  background-color: @vl_bg;
  color: @vl_fg;
}

button {
  background-color: @vl_bg_soft;
  color: @vl_fg;
  border: 1px solid @vl_border;
  border-radius: 4px;
  padding: 4px 10px;
}

button:hover {
  background-color: shade(@vl_bg_soft, 1.08);
}

button:active,
button:checked {
  background-color: @vl_accent;
  color: @vl_accent_on;
}

button:disabled {
  color: @vl_fg_disabled;
}

button.suggested-action {
  background-color: @vl_accent;
  color: @vl_accent_on;
  border-color: @vl_accent;
}

button.destructive-action {
  background-color: @vl_danger;
  color: @vl_accent_on;
}

entry {
  background-color: @vl_bg_sunk;
  color: @vl_fg;
  border: 1px solid @vl_border;
  border-radius: 4px;
  padding: 4px 6px;
}

entry:focus {
  border-color: @vl_accent;
}

check,
radio {
  background-color: @vl_bg_soft;
  border: 1px solid @vl_border;
}

check:checked,
radio:checked {
  background-color: @vl_accent;
  border-color: @vl_accent;
  color: @vl_accent_on;
}

notebook > header {
  background-color: @vl_bg_soft;
  border-color: @vl_border;
}

notebook > header tab {
  color: @vl_fg_muted;
  padding: 6px 12px;
}

notebook > header tab:checked {
  color: @vl_fg;
  border-bottom: 2px solid @vl_accent;
}

menu,
.menu,
menuitem {
  background-color: @vl_bg_overlay;
  color: @vl_fg;
}

menuitem:hover {
  background-color: alpha(@vl_accent, 0.2);
}

headerbar {
  background-color: @vl_bg_soft;
  color: @vl_fg;
  border-bottom: 1px solid @vl_border;
}

scrollbar {
  background-color: transparent;
}

scrollbar slider {
  background-color: @vl_border_strong;
  border-radius: 6px;
  min-width: 6px;
  min-height: 6px;
}

scrollbar slider:hover {
  background-color: @vl_accent;
}

progressbar > trough {
  background-color: @vl_bg_sunk;
  border-radius: 4px;
}

progressbar > trough > progress {
  background-color: @vl_accent;
  border-radius: 4px;
}

tooltip {
  background-color: @vl_bg_overlay;
  color: @vl_fg;
  border: 1px solid @vl_border;
}

selection,
*:selected {
  background-color: alpha(@vl_accent, 0.35);
  color: @vl_fg;
}

.warning {
  color: @vl_warning;
}

.error {
  color: @vl_danger;
}

.success {
  color: @vl_success;
}
`;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tools/templates/gtk3.test.mjs`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add tools/templates/gtk3.mjs tools/templates/gtk3.test.mjs
git commit -m "✨ feat: add GTK3 stylesheet template"
```

---

### Task 5: GTK2 gtkrc template

**Files:**

- Create: `tools/templates/gtk2.mjs`
- Test: `tools/templates/gtk2.test.mjs`

**Interfaces:**

- Consumes: same `flavorBlock`/`accentHex`/`accentOnHex` shape as Task 4.
- Produces (used by Task 9): `renderGtk2Gtkrc(flavorBlock: object, accentHex: string, accentOnHex: string): string` — full `gtkrc` file content.

- [ ] **Step 1: Write the failing test**

```js
// tools/templates/gtk2.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { renderGtk2Gtkrc } from "./gtk2.mjs";
import { flavorBlock, resolveAccent, accentOn } from "../lib/tokens.mjs";

test("renderGtk2Gtkrc embeds surface and accent colors", () => {
  const noon = flavorBlock("noon");
  const gtkrc = renderGtk2Gtkrc(
    noon,
    resolveAccent("noon", "red"),
    accentOn("noon"),
  );
  assert.match(gtkrc, /bg\[NORMAL\]\s+= "#f5f5f5"/);
  assert.match(gtkrc, /bg\[SELECTED\]\s+= "#b91c1c"/);
  assert.match(gtkrc, /fg\[SELECTED\]\s+= "#f5f5f5"/);
});

test("renderGtk2Gtkrc declares the default widget class binding", () => {
  const noon = flavorBlock("noon");
  const gtkrc = renderGtk2Gtkrc(
    noon,
    resolveAccent("noon", "red"),
    accentOn("noon"),
  );
  assert.match(gtkrc, /class "GtkWidget" style "vivid-life-default"/);
  assert.match(gtkrc, /class "GtkButton" style "vivid-life-button"/);
  assert.match(gtkrc, /class "GtkEntry" style "vivid-life-entry"/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tools/templates/gtk2.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```js
// tools/templates/gtk2.mjs
export function renderGtk2Gtkrc(flavorBlock, accentHex, accentOnHex) {
  const { surface, text, border } = flavorBlock;

  return `# Generated by tools/generate.mjs — do not edit by hand.

gtk-color-scheme = "bg_color:${surface.bg}\\nfg_color:${text.fg}\\nbase_color:${surface.bg_sunk}\\ntext_color:${text.fg}\\nselected_bg_color:${accentHex}\\nselected_fg_color:${accentOnHex}"

style "vivid-life-default" {
  bg[NORMAL]      = "${surface.bg}"
  bg[PRELIGHT]    = "${surface.bg_soft}"
  bg[ACTIVE]      = "${accentHex}"
  bg[SELECTED]    = "${accentHex}"
  bg[INSENSITIVE] = "${surface.bg_soft}"

  fg[NORMAL]      = "${text.fg}"
  fg[PRELIGHT]    = "${text.fg}"
  fg[ACTIVE]      = "${accentOnHex}"
  fg[SELECTED]    = "${accentOnHex}"
  fg[INSENSITIVE] = "${text.fg_disabled}"

  base[NORMAL]    = "${surface.bg_sunk}"
  base[SELECTED]  = "${accentHex}"

  text[NORMAL]    = "${text.fg}"
  text[SELECTED]  = "${accentOnHex}"

  xthickness = 1
  ythickness = 1
}

class "GtkWidget" style "vivid-life-default"

style "vivid-life-button" {
  bg[NORMAL]   = "${surface.bg_soft}"
  bg[PRELIGHT] = "${border.strong}"
  bg[ACTIVE]   = "${accentHex}"
  fg[ACTIVE]   = "${accentOnHex}"
}

class "GtkButton" style "vivid-life-button"

style "vivid-life-entry" {
  base[NORMAL] = "${surface.bg_sunk}"
  text[NORMAL] = "${text.fg}"
}

class "GtkEntry" style "vivid-life-entry"
`;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tools/templates/gtk2.test.mjs`
Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add tools/templates/gtk2.mjs tools/templates/gtk2.test.mjs
git commit -m "✨ feat: add GTK2 gtkrc template"
```

---

### Task 6: GTK4 stylesheet template

**Files:**

- Create: `tools/templates/gtk4.mjs`
- Test: `tools/templates/gtk4.test.mjs`

**Interfaces:**

- Consumes: same `flavorBlock`/`accentHex`/`accentOnHex` shape as Task 4.
- Produces (used by Task 9): `renderGtk4Css(flavorBlock: object, accentHex: string, accentOnHex: string): string` — full `gtk.css` file content, including a header comment documenting the libadwaita limitation (per spec Non-goals).

- [ ] **Step 1: Write the failing test**

```js
// tools/templates/gtk4.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { renderGtk4Css } from "./gtk4.mjs";
import { flavorBlock, resolveAccent, accentOn } from "../lib/tokens.mjs";

test("renderGtk4Css documents the libadwaita limitation", () => {
  const twilight = flavorBlock("twilight");
  const css = renderGtk4Css(
    twilight,
    resolveAccent("twilight", "green"),
    accentOn("twilight"),
  );
  assert.match(css, /libadwaita/i);
});

test("renderGtk4Css embeds the flavor and accent colors", () => {
  const twilight = flavorBlock("twilight");
  const css = renderGtk4Css(
    twilight,
    resolveAccent("twilight", "green"),
    accentOn("twilight"),
  );
  assert.match(css, /@define-color vl_bg #404040;/);
  assert.match(css, /@define-color vl_accent #84cc16;/);
});

test("renderGtk4Css styles core widgets", () => {
  const twilight = flavorBlock("twilight");
  const css = renderGtk4Css(
    twilight,
    resolveAccent("twilight", "green"),
    accentOn("twilight"),
  );
  for (const selector of [
    "button",
    "entry",
    "headerbar",
    "scrollbar",
    "progressbar",
  ]) {
    assert.ok(css.includes(selector), `expected CSS to style ${selector}`);
  }
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tools/templates/gtk4.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```js
// tools/templates/gtk4.mjs
export function renderGtk4Css(flavorBlock, accentHex, accentOnHex) {
  const { surface, text, border, semantic } = flavorBlock;

  return `/* Generated by tools/generate.mjs — do not edit by hand.
 *
 * GTK4 limitation: apps built on libadwaita largely ignore this
 * stylesheet and follow libadwaita's own accent-color system instead.
 * This file only affects GTK4 apps that render plain GTK4 widgets
 * without opting into libadwaita theming. See
 * docs/superpowers/specs/2026-08-30-xfce-theme-port-design.md.
 */

@define-color vl_bg ${surface.bg};
@define-color vl_bg_soft ${surface.bg_soft};
@define-color vl_bg_sunk ${surface.bg_sunk};
@define-color vl_bg_overlay ${surface.bg_overlay};
@define-color vl_fg ${text.fg};
@define-color vl_fg_muted ${text.fg_muted};
@define-color vl_fg_subtle ${text.fg_subtle};
@define-color vl_fg_disabled ${text.fg_disabled};
@define-color vl_border ${border.default};
@define-color vl_border_subtle ${border.subtle};
@define-color vl_border_strong ${border.strong};
@define-color vl_accent ${accentHex};
@define-color vl_accent_on ${accentOnHex};
@define-color vl_success ${semantic.success};
@define-color vl_warning ${semantic.warning};
@define-color vl_danger ${semantic.danger};
@define-color vl_info ${semantic.info};

window,
.background {
  background-color: @vl_bg;
  color: @vl_fg;
}

button {
  background-color: @vl_bg_soft;
  color: @vl_fg;
  border: 1px solid @vl_border;
  border-radius: 4px;
  padding: 4px 10px;
}

button:hover {
  background-color: @vl_border;
}

button:active,
button:checked {
  background-color: @vl_accent;
  color: @vl_accent_on;
}

button:disabled {
  color: @vl_fg_disabled;
}

entry {
  background-color: @vl_bg_sunk;
  color: @vl_fg;
  border: 1px solid @vl_border;
  border-radius: 4px;
  padding: 4px 6px;
}

entry:focus {
  border-color: @vl_accent;
}

check,
radio {
  background-color: @vl_bg_soft;
  border: 1px solid @vl_border;
}

check:checked,
radio:checked {
  background-color: @vl_accent;
  border-color: @vl_accent;
  color: @vl_accent_on;
}

headerbar {
  background-color: @vl_bg_soft;
  color: @vl_fg;
  border-bottom: 1px solid @vl_border;
}

scrollbar slider {
  background-color: @vl_border_strong;
  border-radius: 6px;
  min-width: 6px;
  min-height: 6px;
}

scrollbar slider:hover {
  background-color: @vl_accent;
}

progressbar > trough {
  background-color: @vl_bg_sunk;
  border-radius: 4px;
}

progressbar > trough > progress {
  background-color: @vl_accent;
  border-radius: 4px;
}

tooltip {
  background-color: @vl_bg_overlay;
  color: @vl_fg;
  border: 1px solid @vl_border;
}
`;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tools/templates/gtk4.test.mjs`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add tools/templates/gtk4.mjs tools/templates/gtk4.test.mjs
git commit -m "✨ feat: add GTK4 stylesheet template"
```

---

### Task 7: Xfwm4 themerc and button SVG templates

**Xfwm4 asset scope for v1:** Xfwm4 themes conventionally ship border-corner/edge images too, but a `themerc` plus button images alone is a valid, common minimal Xfwm4 theme — Xfwm4 falls back to its built-in flat border rendering when no border images are present. This plan scopes Xfwm4 asset generation to the three window buttons (close, hide, maximize) in active/inactive states, and documents the border-image gap as future work (added to the spec's "Open questions" list in Task 13's README).

**Files:**

- Create: `tools/templates/xfwm4.mjs`
- Test: `tools/templates/xfwm4.test.mjs`

**Interfaces:**

- Consumes: same `flavorBlock`/`accentHex`/`accentOnHex` shape as Task 4.
- Produces (used by Task 9):
  - `renderThemerc(flavorBlock: object, accentHex: string, accentOnHex: string): string` — full `themerc` file content.
  - `BUTTON_KINDS: string[]` — `['close', 'hide', 'maximize']`
  - `renderButtonSvg({ kind: string, active: boolean, backgroundHex: string, glyphHex: string }): string` — a 16×16 SVG string for one button/state.

- [ ] **Step 1: Write the failing test**

```js
// tools/templates/xfwm4.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { renderThemerc, renderButtonSvg, BUTTON_KINDS } from "./xfwm4.mjs";
import { flavorBlock, resolveAccent, accentOn } from "../lib/tokens.mjs";

test("renderThemerc embeds title text and shadow colors", () => {
  const dawn = flavorBlock("dawn");
  const themerc = renderThemerc(
    dawn,
    resolveAccent("dawn", "purple"),
    accentOn("dawn"),
  );
  assert.match(themerc, /^active_text_color=#171717$/m);
  assert.match(themerc, /^inactive_text_color=#525252$/m);
  assert.match(themerc, /^button_offset=0$/m);
});

test("BUTTON_KINDS lists close, hide, maximize", () => {
  assert.deepEqual(BUTTON_KINDS, ["close", "hide", "maximize"]);
});

test("renderButtonSvg produces a valid 16x16 SVG with the glyph color applied", () => {
  const svg = renderButtonSvg({
    kind: "close",
    active: true,
    backgroundHex: "#404040",
    glyphHex: "#f5f5f5",
  });
  assert.match(svg, /<svg[^>]*width="16"[^>]*height="16"/);
  assert.match(svg, /fill="#404040"/);
  assert.match(svg, /stroke="#f5f5f5"/);
});

test("renderButtonSvg throws on an unknown kind", () => {
  assert.throws(
    () =>
      renderButtonSvg({
        kind: "nope",
        active: true,
        backgroundHex: "#000",
        glyphHex: "#fff",
      }),
    /Unknown button kind/,
  );
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tools/templates/xfwm4.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```js
// tools/templates/xfwm4.mjs
export function renderThemerc(flavorBlock, accentHex, accentOnHex) {
  const { text, border } = flavorBlock;

  return `# Generated by tools/generate.mjs — do not edit by hand.
active_text_color=${text.fg}
inactive_text_color=${text.fg_subtle}
active_shadow_color=${border.strong}
inactive_shadow_color=${border.subtle}
button_offset=0
title_alignment=left
title_shadow_active=false
title_shadow_inactive=false
show_app_icon=1
full_width_title=true
`;
}

export const BUTTON_KINDS = ["close", "hide", "maximize"];

const GLYPHS = {
  close: "M4,4 L12,12 M12,4 L4,12",
  hide: "M4,11 L12,11",
  maximize: "M4,4 L12,4 L12,12 L4,12 Z",
};

export function renderButtonSvg({ kind, active, backgroundHex, glyphHex }) {
  const glyphPath = GLYPHS[kind];
  if (!glyphPath) {
    throw new Error(`Unknown button kind: ${kind}`);
  }
  const opacity = active ? "1" : "0.5";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
  <circle cx="8" cy="8" r="7" fill="${backgroundHex}" opacity="${opacity}" />
  <path d="${glyphPath}" stroke="${glyphHex}" stroke-width="1.5" stroke-linecap="round" fill="none" opacity="${opacity}" />
</svg>
`;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tools/templates/xfwm4.test.mjs`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add tools/templates/xfwm4.mjs tools/templates/xfwm4.test.mjs
git commit -m "✨ feat: add Xfwm4 themerc and button SVG templates"
```

---

### Task 8: rsvg-convert rasterization wrapper

**Files:**

- Create: `tools/lib/rasterize.mjs`
- Test: `tools/lib/rasterize.test.mjs`

**Interfaces:**

- Consumes: an SVG string (e.g. from Task 7's `renderButtonSvg`), a target size in pixels, an output file path.
- Produces (used by Task 9): `rasterizeSvgToPng(svgContent: string, sizePx: number, outputPath: string): void` — writes a PNG to `outputPath` via `rsvg-convert`, synchronously. Throws if `rsvg-convert` exits non-zero.
- Also produces: `hasRsvgConvert(): boolean` — true if the `rsvg-convert` binary is on `PATH`.

- [ ] **Step 1: Write the failing test**

```js
// tools/lib/rasterize.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { rasterizeSvgToPng, hasRsvgConvert } from "./rasterize.mjs";

const SAMPLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><circle cx="8" cy="8" r="7" fill="#ff0000" /></svg>`;

test("rasterizeSvgToPng writes a non-empty PNG file", (t) => {
  if (!hasRsvgConvert()) {
    t.skip("rsvg-convert not installed on this machine");
    return;
  }
  const outputPath = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), "vlx-")),
    "out.png",
  );
  rasterizeSvgToPng(SAMPLE_SVG, 16, outputPath);
  const stats = fs.statSync(outputPath);
  assert.ok(stats.size > 0);
  const header = fs.readFileSync(outputPath).subarray(0, 8);
  assert.deepEqual([...header.subarray(1, 4)], [0x50, 0x4e, 0x47]); // "PNG"
});

test("rasterizeSvgToPng throws on invalid SVG", (t) => {
  if (!hasRsvgConvert()) {
    t.skip("rsvg-convert not installed on this machine");
    return;
  }
  const outputPath = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), "vlx-")),
    "out.png",
  );
  assert.throws(() => rasterizeSvgToPng("not valid svg", 16, outputPath));
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tools/lib/rasterize.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```js
// tools/lib/rasterize.mjs
import { spawnSync } from "node:child_process";

export function hasRsvgConvert() {
  const result = spawnSync("rsvg-convert", ["--version"], { stdio: "ignore" });
  return result.status === 0;
}

export function rasterizeSvgToPng(svgContent, sizePx, outputPath) {
  const result = spawnSync(
    "rsvg-convert",
    [
      "--width",
      String(sizePx),
      "--height",
      String(sizePx),
      "--output",
      outputPath,
    ],
    { input: svgContent, encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error(
      `rsvg-convert failed (exit ${result.status}): ${result.stderr}`,
    );
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tools/lib/rasterize.test.mjs`
Expected: PASS (2 tests, or 2 skipped if `rsvg-convert` isn't installed on the dev machine — install via `apt install librsvg2-bin` / `dnf install librsvg2-tools` / `pacman -S librsvg` to exercise the real path).

- [ ] **Step 5: Commit**

```bash
git add tools/lib/rasterize.mjs tools/lib/rasterize.test.mjs
git commit -m "✨ feat: add rsvg-convert rasterization wrapper"
```

---

### Task 9: Generator orchestrator with `--check`

**Files:**

- Create: `tools/generate.mjs`
- Test: `tools/generate.test.mjs`

**Interfaces:**

- Consumes: `allCombinations`, `flavorBlock`, `resolveAccent`, `accentOn` (Task 2); `TARGETS`, `targetOutputDir` (Task 3); `renderGtk3Css` (Task 4); `renderGtk2Gtkrc` (Task 5); `renderGtk4Css` (Task 6); `renderThemerc`, `BUTTON_KINDS`, `renderButtonSvg` (Task 7); `rasterizeSvgToPng`, `hasRsvgConvert` (Task 8).
- Produces (used by Task 10 and the CLI): `renderAll(outputRoot: string): { dirsWritten: number, filesWritten: number }` — writes all 96 theme directories under `outputRoot`. `checkDrift(repoRoot: string): string[]` — list of relative paths that differ between a fresh render and what's committed at `repoRoot`; empty array means no drift.

- [ ] **Step 1: Write the failing test**

```js
// tools/generate.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { renderAll } from "./generate.mjs";
import { hasRsvgConvert } from "./lib/rasterize.mjs";

test("renderAll writes all 24 directories for gtk-2.0, gtk-3.0, gtk-4.0, xfwm4", () => {
  const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vlx-generate-"));
  const result = renderAll(outputRoot);

  for (const target of ["gtk-2.0", "gtk-3.0", "gtk-4.0", "xfwm4"]) {
    const dirs = fs.readdirSync(path.join(outputRoot, target));
    assert.equal(
      dirs.length,
      24,
      `expected 24 dirs under ${target}, got ${dirs.length}`,
    );
  }
  assert.equal(result.dirsWritten, 96);
});

test("renderAll writes non-empty gtkrc, gtk.css, and themerc files", () => {
  const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vlx-generate-"));
  renderAll(outputRoot);

  const gtkrc = fs.readFileSync(
    path.join(outputRoot, "gtk-2.0", "vivid-life-midnight-purple", "gtkrc"),
    "utf8",
  );
  assert.ok(gtkrc.length > 0);

  const gtk3css = fs.readFileSync(
    path.join(outputRoot, "gtk-3.0", "vivid-life-noon-blue", "gtk.css"),
    "utf8",
  );
  assert.match(gtk3css, /@define-color vl_accent/);

  const themerc = fs.readFileSync(
    path.join(outputRoot, "xfwm4", "vivid-life-dawn-green", "themerc"),
    "utf8",
  );
  assert.match(themerc, /^active_text_color=/m);
});

test("renderAll writes button PNGs when rsvg-convert is available", (t) => {
  if (!hasRsvgConvert()) {
    t.skip("rsvg-convert not installed on this machine");
    return;
  }
  const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vlx-generate-"));
  renderAll(outputRoot);

  const themeDir = path.join(outputRoot, "xfwm4", "vivid-life-midnight-purple");
  for (const kind of ["close", "hide", "maximize"]) {
    for (const state of ["active", "inactive"]) {
      const pngPath = path.join(themeDir, `${kind}-${state}.png`);
      assert.ok(
        fs.statSync(pngPath).size > 0,
        `expected ${pngPath} to exist and be non-empty`,
      );
    }
  }
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tools/generate.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```js
// tools/generate.mjs
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import {
  allCombinations,
  flavorBlock,
  resolveAccent,
  accentOn,
} from "./lib/tokens.mjs";
import { TARGETS, targetOutputDir } from "./lib/paths.mjs";
import { renderGtk3Css } from "./templates/gtk3.mjs";
import { renderGtk2Gtkrc } from "./templates/gtk2.mjs";
import { renderGtk4Css } from "./templates/gtk4.mjs";
import {
  renderThemerc,
  BUTTON_KINDS,
  renderButtonSvg,
} from "./templates/xfwm4.mjs";
import { rasterizeSvgToPng, hasRsvgConvert } from "./lib/rasterize.mjs";

const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url));
const BUTTON_SIZE_PX = 16;

export function renderAll(outputRoot) {
  let dirsWritten = 0;
  let filesWritten = 0;
  const canRasterize = hasRsvgConvert();

  for (const { flavor, variant } of allCombinations()) {
    const block = flavorBlock(flavor);
    const accentHex = resolveAccent(flavor, variant);
    const accentOnHex = accentOn(flavor);

    const gtk2Dir = targetOutputDir(outputRoot, "gtk-2.0", flavor, variant);
    fs.mkdirSync(gtk2Dir, { recursive: true });
    fs.writeFileSync(
      path.join(gtk2Dir, "gtkrc"),
      renderGtk2Gtkrc(block, accentHex, accentOnHex),
    );
    dirsWritten += 1;
    filesWritten += 1;

    const gtk3Dir = targetOutputDir(outputRoot, "gtk-3.0", flavor, variant);
    fs.mkdirSync(gtk3Dir, { recursive: true });
    fs.writeFileSync(
      path.join(gtk3Dir, "gtk.css"),
      renderGtk3Css(block, accentHex, accentOnHex),
    );
    dirsWritten += 1;
    filesWritten += 1;

    const gtk4Dir = targetOutputDir(outputRoot, "gtk-4.0", flavor, variant);
    fs.mkdirSync(gtk4Dir, { recursive: true });
    fs.writeFileSync(
      path.join(gtk4Dir, "gtk.css"),
      renderGtk4Css(block, accentHex, accentOnHex),
    );
    dirsWritten += 1;
    filesWritten += 1;

    const xfwm4Dir = targetOutputDir(outputRoot, "xfwm4", flavor, variant);
    fs.mkdirSync(xfwm4Dir, { recursive: true });
    fs.writeFileSync(
      path.join(xfwm4Dir, "themerc"),
      renderThemerc(block, accentHex, accentOnHex),
    );
    filesWritten += 1;
    if (canRasterize) {
      for (const kind of BUTTON_KINDS) {
        for (const active of [true, false]) {
          const svg = renderButtonSvg({
            kind,
            active,
            backgroundHex: block.surface.bg_soft,
            glyphHex: active ? block.text.fg : block.text.fg_subtle,
          });
          const state = active ? "active" : "inactive";
          const pngPath = path.join(xfwm4Dir, `${kind}-${state}.png`);
          rasterizeSvgToPng(svg, BUTTON_SIZE_PX, pngPath);
          filesWritten += 1;
        }
      }
    }
    dirsWritten += 1;
  }

  return { dirsWritten, filesWritten };
}

function listFilesRecursive(root) {
  const results = [];
  for (const target of TARGETS) {
    const targetPath = path.join(root, target);
    if (!fs.existsSync(targetPath)) continue;
    for (const themeDir of fs.readdirSync(targetPath)) {
      const themePath = path.join(targetPath, themeDir);
      for (const file of fs.readdirSync(themePath)) {
        results.push(path.join(target, themeDir, file));
      }
    }
  }
  return results;
}

export function checkDrift(repoRoot) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vlx-check-"));
  renderAll(tempRoot);

  const drift = [];
  const freshFiles = new Set(listFilesRecursive(tempRoot));
  const committedFiles = new Set(listFilesRecursive(repoRoot));

  for (const relPath of freshFiles) {
    const freshContent = fs.readFileSync(path.join(tempRoot, relPath));
    const committedPath = path.join(repoRoot, relPath);
    if (
      !fs.existsSync(committedPath) ||
      !freshContent.equals(fs.readFileSync(committedPath))
    ) {
      drift.push(relPath);
    }
  }
  for (const relPath of committedFiles) {
    if (!freshFiles.has(relPath)) {
      drift.push(relPath);
    }
  }

  fs.rmSync(tempRoot, { recursive: true, force: true });
  return drift;
}

function main() {
  const checkMode = process.argv.includes("--check");

  if (checkMode) {
    const drift = checkDrift(REPO_ROOT);
    if (drift.length > 0) {
      console.error(
        `Generated output is stale (${drift.length} file(s) differ):`,
      );
      for (const file of drift) console.error(`  ${file}`);
      process.exitCode = 1;
      return;
    }
    console.log("Generated output matches tokens — no drift.");
    return;
  }

  const { dirsWritten, filesWritten } = renderAll(REPO_ROOT);
  console.log(
    `Wrote ${filesWritten} files across ${dirsWritten} theme directories.`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tools/generate.test.mjs`
Expected: PASS, 3 tests (button-PNG test skips if `rsvg-convert` is absent).

- [ ] **Step 5: Commit**

```bash
git add tools/generate.mjs tools/generate.test.mjs
git commit -m "✨ feat: add generator orchestrator with --check drift detection"
```

---

### Task 10: Generate and commit the 96 theme directories

**Files:**

- Create: `gtk-2.0/vivid-life-*/gtkrc` (24), `gtk-3.0/vivid-life-*/gtk.css` (24), `gtk-4.0/vivid-life-*/gtk.css` (24), `xfwm4/vivid-life-*/{themerc,*.png}` (24)

**Interfaces:**

- Consumes: `renderAll` from Task 9, run against the real repo root (not a temp dir).

- [ ] **Step 1: Ensure `rsvg-convert` is installed (for complete Xfwm4 button assets)**

Run: `command -v rsvg-convert || echo missing`
If missing, install it: `sudo apt install librsvg2-bin` (Debian/Ubuntu) or the equivalent for your distro. This step is maintainer-only — end users never need `rsvg-convert`.

- [ ] **Step 2: Run the generator**

Run: `npm run generate`
Expected: prints `Wrote N files across 96 theme directories.`

- [ ] **Step 3: Verify the directory counts**

Run: `for d in gtk-2.0 gtk-3.0 gtk-4.0 xfwm4; do echo "$d: $(ls "$d" | wc -l)"; done`
Expected: each target prints `24`.

- [ ] **Step 4: Verify `--check` reports no drift immediately after generation**

Run: `npm run check`
Expected: prints `Generated output matches tokens — no drift.` and exits 0.

- [ ] **Step 5: Spot-check one generated file for sanity**

Run: `cat gtk-3.0/vivid-life-midnight-purple/gtk.css | grep vl_accent`
Expected: `@define-color vl_accent #d8b4fe;` and `@define-color vl_accent_on #171717;` (matches Task 2's documented midnight/purple test case).

- [ ] **Step 6: Commit**

```bash
git add gtk-2.0 gtk-3.0 gtk-4.0 xfwm4
git commit -m "✨ feat: generate all 96 GTK2/GTK3/GTK4/Xfwm4 theme files"
```

---

### Task 11: End-user installer (`install.sh`)

**Files:**

- Create: `install.sh`

**Interfaces:**

- Consumes: the generated `gtk-2.0/`, `gtk-3.0/`, `gtk-4.0/`, `xfwm4/` directories from Task 10 (by relative path from the script's own location — no build step, no Node).
- Produces: theme files copied into `~/.themes/vivid-life-<flavor>-<variant>/<target>/`.

Testing for this task is `shellcheck` + manual runs (per spec — no automated test framework for the installer).

- [ ] **Step 1: Write `install.sh`**

```sh
#!/bin/sh
# Vivid Life Xfce installer.
# POSIX sh + coreutils only. No Node, no npm, no network access required.
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO_ROOT="$SCRIPT_DIR"
THEMES_DIR="$HOME/.themes"

ALL_FLAVORS="midnight twilight dawn noon"
ALL_VARIANTS="red orange yellow green blue purple"
ALL_TARGETS="gtk-2.0 gtk-3.0 gtk-4.0 xfwm4"

FLAVOR=""
VARIANT=""
TARGETS=""
INSTALL_ALL=0
ASSUME_YES=0
DRY_RUN=0

usage() {
  cat <<'EOF'
Usage: install.sh [OPTIONS]

Options:
  --flavor=NAME       midnight | twilight | dawn | noon
  --variant=NAME      red | orange | yellow | green | blue | purple
  --targets=LIST      comma-separated: gtk-2.0,gtk-3.0,gtk-4.0,xfwm4
                      (default: auto-detected)
  --all               install all 24 flavor/variant combinations for the
                      selected/detected targets
  -y, --yes           skip confirmation prompts (requires --flavor and
                      --variant, or --all)
  --dry-run           print what would happen without copying anything
  -h, --help          show this help
EOF
}

die() {
  echo "install.sh: $*" >&2
  exit 1
}

is_in_list() {
  needle=$1
  haystack=$2
  for item in $haystack; do
    [ "$item" = "$needle" ] && return 0
  done
  return 1
}

for arg in "$@"; do
  case "$arg" in
    --flavor=*) FLAVOR="${arg#--flavor=}" ;;
    --variant=*) VARIANT="${arg#--variant=}" ;;
    --targets=*) TARGETS=$(echo "${arg#--targets=}" | tr ',' ' ') ;;
    --all) INSTALL_ALL=1 ;;
    -y | --yes) ASSUME_YES=1 ;;
    --dry-run) DRY_RUN=1 ;;
    -h | --help)
      usage
      exit 0
      ;;
    *) die "unknown option: $arg (see --help)" ;;
  esac
done

if [ -n "$FLAVOR" ] && ! is_in_list "$FLAVOR" "$ALL_FLAVORS"; then
  die "unknown flavor: $FLAVOR (expected one of: $ALL_FLAVORS)"
fi
if [ -n "$VARIANT" ] && ! is_in_list "$VARIANT" "$ALL_VARIANTS"; then
  die "unknown variant: $VARIANT (expected one of: $ALL_VARIANTS)"
fi

detect_target() {
  case "$1" in
    gtk-2.0) pkg-config --exists gtk+-2.0 2>/dev/null ;;
    gtk-3.0) pkg-config --exists gtk+-3.0 2>/dev/null ;;
    gtk-4.0) pkg-config --exists gtk4 2>/dev/null ;;
    xfwm4) command -v xfwm4 >/dev/null 2>&1 ;;
    *) return 1 ;;
  esac
}

if [ -z "$TARGETS" ]; then
  detected=""
  # shellcheck disable=SC2086 # intentional word-splitting over a space-separated list
  for target in $ALL_TARGETS; do
    if detect_target "$target"; then
      detected="$detected $target"
    fi
  done
  TARGETS=$(echo "$detected" | sed 's/^ //')
fi

if [ -z "$TARGETS" ]; then
  echo "install.sh: could not auto-detect any of: $ALL_TARGETS" >&2
  echo "install.sh: pass --targets explicitly, e.g. --targets=gtk-3.0,xfwm4" >&2
  exit 1
fi

printf 'Detected/selected targets:'
# shellcheck disable=SC2086
for t in $TARGETS; do printf ' %s' "$t"; done
printf '\n'

prompt_choice() {
  prompt_label=$1
  choices=$2
  default=$3
  if [ "$ASSUME_YES" -eq 1 ]; then
    echo "$default"
    return
  fi
  printf '%s [%s] (default: %s): ' "$prompt_label" "$choices" "$default" >&2
  read -r answer
  if [ -z "$answer" ]; then
    echo "$default"
  else
    echo "$answer"
  fi
}

if [ "$INSTALL_ALL" -eq 0 ]; then
  if [ -z "$FLAVOR" ]; then
    FLAVOR=$(prompt_choice "Flavor" "$ALL_FLAVORS" "midnight")
    is_in_list "$FLAVOR" "$ALL_FLAVORS" || die "unknown flavor: $FLAVOR"
  fi
  if [ -z "$VARIANT" ]; then
    VARIANT=$(prompt_choice "Variant" "$ALL_VARIANTS" "purple")
    is_in_list "$VARIANT" "$ALL_VARIANTS" || die "unknown variant: $VARIANT"
  fi
fi

install_one() {
  flavor=$1
  variant=$2
  theme_name="vivid-life-${flavor}-${variant}"
  # shellcheck disable=SC2086
  for target in $TARGETS; do
    src="$REPO_ROOT/$target/$theme_name"
    if [ ! -d "$src" ]; then
      echo "install.sh: skipping $target ($theme_name): not found at $src" >&2
      continue
    fi
    dest="$THEMES_DIR/$theme_name/$target"
    if [ "$DRY_RUN" -eq 1 ]; then
      echo "[dry-run] would copy $src -> $dest"
      continue
    fi
    mkdir -p "$dest"
    cp -r "$src"/. "$dest"/
    echo "Installed $theme_name ($target) -> $dest"
  done
}

if [ "$INSTALL_ALL" -eq 1 ]; then
  # shellcheck disable=SC2086
  for flavor in $ALL_FLAVORS; do
    # shellcheck disable=SC2086
    for variant in $ALL_VARIANTS; do
      install_one "$flavor" "$variant"
    done
  done
else
  install_one "$FLAVOR" "$VARIANT"
fi

print_recommendations() {
  cat <<'EOF'

Icon and font recommendations (not bundled -- install separately if you'd like):

  Icons: Papirus icon theme, with per-variant folder colors via papirus-folders.
    apt:    sudo apt install papirus-icon-theme papirus-folders
    dnf:    sudo dnf install papirus-icon-theme
    pacman: sudo pacman -S papirus-icon-theme papirus-folders
    Match your variant's folder color:
      red -> red   orange -> orange   yellow -> yellow
      green -> green   blue -> blue   purple -> violet
    Example: papirus-folders -C violet --theme Papirus-Dark

  Fonts: Atkinson Hyperlegible Next (UI) + Atkinson Hyperlegible Mono (code/terminal)
    Source: https://www.brailleinstitute.org/freefont (OFL-1.1)

See https://github.com/vivid-life-theme/vivid-life-design-system for details.
EOF
}

print_recommendations

echo
echo "Done. Select the theme in xfce4-appearance-settings (GTK) and"
echo "xfwm4-settings (Window Manager) if it wasn't applied automatically."
```

- [ ] **Step 2: Make it executable**

Run: `chmod +x install.sh`

- [ ] **Step 3: Lint with shellcheck**

Run: `shellcheck install.sh`
Expected: no output, exit 0. If it flags anything not already covered by the inline `# shellcheck disable=` comments above, fix the underlying issue (don't blanket-disable new warnings).

- [ ] **Step 4: Manual dry-run test with explicit flags**

Run: `./install.sh --flavor=midnight --variant=purple --targets=gtk-3.0,xfwm4 --dry-run`
Expected: prints `Detected/selected targets: gtk-3.0 xfwm4`, then two `[dry-run] would copy ...` lines, then the recommendations block, then the closing message. No files are created (`ls ~/.themes/vivid-life-midnight-purple` should fail with "No such file or directory").

- [ ] **Step 5: Manual real-install test with explicit flags**

Run: `./install.sh --flavor=midnight --variant=purple --targets=gtk-3.0 -y`
Expected: prints `Installed vivid-life-midnight-purple (gtk-3.0) -> ...`. Verify: `test -f ~/.themes/vivid-life-midnight-purple/gtk-3.0/gtk.css && echo OK`. Clean up afterward: `rm -rf ~/.themes/vivid-life-midnight-purple`.

- [ ] **Step 6: Manual interactive test (only if a terminal is available)**

Run: `./install.sh --targets=gtk-3.0 --dry-run` with no `--flavor`/`--variant`, and answer the two prompts. Expected: prompts appear on stderr, defaults apply on Enter, dry-run output reflects the chosen flavor/variant.

- [ ] **Step 7: Commit**

```bash
git add install.sh
git commit -m "✨ feat: add end-user installer with auto-detection"
```

---

### Task 12: README

**Files:**

- Create: `README.md`

**Interfaces:**

- Consumes: nothing programmatically — documentation only.

- [ ] **Step 1: Write `README.md`**

````markdown
# Vivid Life Xfce

A port of the [Vivid Life Theme](https://github.com/vivid-life-theme/vivid-life-design-system) design system to Xfce: GTK2, GTK3, GTK4, and Xfwm4 themes across 4 flavors (Midnight, Twilight, Dawn, Noon) × 6 variants (Red, Orange, Yellow, Green, Blue, Purple) — 24 combinations total, per GTK/window-manager target.

## Install

```sh
git clone https://github.com/vivid-life-theme/vivid-life-xfce.git
cd vivid-life-xfce
./install.sh
```
````

`install.sh` auto-detects which of GTK2, GTK3, GTK4, and Xfwm4 you have installed and only offers to install matching targets. It prompts for a flavor and variant, then copies the theme into `~/.themes/`.

Non-interactive install:

```sh
./install.sh --flavor=midnight --variant=purple --targets=gtk-3.0,xfwm4 -y
```

Install every combination (all 24) for the detected targets:

```sh
./install.sh --all -y
```

Preview what would happen without copying anything:

```sh
./install.sh --dry-run
```

Run `./install.sh --help` for the full option list.

After installing, select the theme in **Settings → Appearance** (GTK) and **Settings → Window Manager** (Xfwm4).

## GTK4 note

GTK4 apps built on **libadwaita** largely ignore custom `gtk-4.0/gtk.css` stylesheets and follow libadwaita's own accent-color system instead. The GTK4 theme here is shipped best-effort for the (shrinking) set of GTK4 apps that don't opt into libadwaita theming.

## Icons and fonts (not bundled)

This theme intentionally does not ship an icon set or font files — see the upstream design system's [iconography guidance](https://github.com/vivid-life-theme/vivid-life-design-system#iconography). `install.sh` prints these recommendations after installing:

- **Icons:** [Papirus](https://github.com/PapirusDevelopmentTeam/papirus-icon-theme) + [`papirus-folders`](https://github.com/PapirusDevelopmentTeam/papirus-folders) to tint folder icons to match your variant.
- **Fonts:** [Atkinson Hyperlegible Next](https://www.brailleinstitute.org/freefont) (UI) and Atkinson Hyperlegible Mono (code/terminal), OFL-1.1 licensed.

## For maintainers: regenerating themes

Theme files under `gtk-2.0/`, `gtk-3.0/`, `gtk-4.0/`, and `xfwm4/` are generated from `@vivid-life-theme/design-system` tokens — never hand-edited. To pick up an upstream design-system update:

```sh
npm install @vivid-life-theme/design-system@<new-version>
npm run generate
npm run check   # confirms committed output matches the tokens
npm test        # runs the generator/template unit tests
git add -A
git commit -m "chore: sync theme output with design-system <new-version>"
```

Requires Node.js >=20 and `rsvg-convert` (`librsvg2-bin` / `librsvg2-tools` / `librsvg`) — maintainer-only; end users never need either.

## Repository layout

```text
gtk-2.0/, gtk-3.0/, gtk-4.0/, xfwm4/   generated theme output (24 dirs each)
tools/                                  generator (Node.js, maintainer-only)
install.sh                              end-user installer (POSIX sh)
docs/superpowers/specs/                 design spec for this port
docs/superpowers/plans/                 implementation plan for this port
```

## License

MIT — see [LICENSE](LICENSE). Fonts recommended above are separately licensed (OFL-1.1) and not distributed here.

````

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "📝 docs: add README with install instructions and icon/font recommendations"
````

---

### Task 13: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full generator test suite**

Run: `npm test`
Expected: all tests pass (button-PNG and rasterize tests only run for real if `rsvg-convert` is installed; they report as skipped otherwise, which still counts as a pass).

- [ ] **Step 2: Confirm generated output has zero drift**

Run: `npm run check`
Expected: `Generated output matches tokens — no drift.`, exit 0.

- [ ] **Step 3: Lint the installer**

Run: `shellcheck install.sh`
Expected: no output, exit 0.

- [ ] **Step 4: Confirm the working tree is clean**

Run: `git status --short`
Expected: no output (everything from Tasks 1-12 is committed).

- [ ] **Step 5: Confirm directory counts one more time end-to-end**

Run: `for d in gtk-2.0 gtk-3.0 gtk-4.0 xfwm4; do test "$(ls "$d" | wc -l)" -eq 24 || echo "MISMATCH: $d"; done`
Expected: no output (no mismatches).

No commit for this task — it only verifies work already committed in Tasks 1-12.
