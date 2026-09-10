# GTK Widget Coverage — Phase 4 (GTK4 and GTK2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking; `- [~]` marks a step whose verification was substituted, with the substitution quoted beneath it.

**Goal:** Bring the GTK4 and GTK2 targets to the same module structure and widget coverage GTK3 reached in phase 3, and put every target's colours behind the same contrast gate.

**Architecture:** Both targets follow phase 1's proven shape — an index that composes per-widget modules, each exporting `render(ctx)` and optionally `contrastPairs(ctx)`. Each target is split as a **pure refactor with byte-identical output first**, then extended. The contrast gate stops walking GTK3 alone and walks all three registries, which is what makes the new colours gated rather than merely written.

**Tech Stack:** Node 20 (ESM, `node --test`), `/usr/bin/python3` + PyGObject, `xvfb-run`, ImageMagick, `gresource` + `objcopy`.

**Spec:** `docs/superpowers/specs/2026-09-05-gtk-widget-coverage-design.md` (this plan implements its Sequencing step 4, "GTK4, then GTK2")

**Predecessor:** `docs/superpowers/plans/2026-09-06-gtk-coverage-phase2.md`, merged to `main` as `522a01f`.

## Global Constraints

- Never hand-encode palette values. Colours come from `@vivid-life-theme/design-system` via `tools/lib/tokens.mjs`. Derived values must be computed from existing tokens by a documented rule.
- All 24 flavor × variant combinations must stay WCAG AA (4.5:1 text, 3:1 non-text).
- The Python interpreter is **`/usr/bin/python3`**, never `python3` from `PATH` — the Homebrew build on this machine has no `gi` module.
- Flavor order is time-based: Midnight, Twilight, Dawn, Noon. Variants capitalized: Red, Orange, Yellow, Green, Blue, Purple. No Cyan.
- Commit messages use Conventional Commits with gitmoji.
- Every new module file must be registered in its target's `*_MODULES` array. The registry tests added in Tasks 1 and 2 fail otherwise.
- `switch` is a reserved word: a `switch.mjs` namespace binding is `switchWidget`. Same treatment for any filename colliding with a keyword.
- **Do not vendor or transliterate another theme's stylesheet** (spec non-goal). GTK4's `Default-dark.css` and Adwaita's `main.rc` are used in this plan strictly as **node-name and binding-vocabulary references** — that vocabulary is GTK API surface, not authored design. Never copy their values, gradients, or assets.
- After changing any module, run `npm run generate && npm run check`. Output is _expected_ to change in the coverage tasks; `check` confirms the committed files match the templates.

---

## Reference: the GTK4 node inventory

Every GTK4 selector in this plan was read out of **GTK4's own default stylesheet**, not recalled. `libgtk-4-1` (4.14.5) is installed, and its stylesheet is embedded in the shared object. Re-extract it any time a selector in this plan looks wrong:

```bash
S=$(mktemp -d)
cp /usr/lib/x86_64-linux-gnu/libgtk-4.so.1 "$S/libgtk4.so"
objcopy --dump-section .gresource.gtk="$S/gtk.gresource" "$S/libgtk4.so"
gresource extract "$S/gtk.gresource" /org/gtk/libgtk/theme/Default/Default-dark.css > "$S/gtk4-default-dark.css"
grep -nE '^frame|^switch|^scale' "$S/gtk4-default-dark.css"
```

`objcopy` must run on a **copy** — it writes a temp file beside its input and has no permission to do that in `/usr/lib`. The Homebrew `gresource` on `PATH` is built without ELF support, so it cannot read the `.so` directly; dumping the section first is what makes it work.

**GTK4 differs from GTK3 in ways that silently produce no-op rules.** These are measured, not assumed:

| Concern         | GTK3 selector                   | GTK4 selector                                       | Consequence of using the GTK3 form                                             |
| --------------- | ------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------ |
| Frame border    | `frame > border`                | `frame`, `.frame`                                   | No `border` child node exists — the rule matches nothing, frames draw no edge  |
| Expander widget | `expander`, `expander arrow`    | `expander-widget`, and `expander` **is** the arrow  | `expander { color: }` tints the arrow, not the widget; the widget rule is lost |
| Tooltip fill    | `tooltip`                       | `tooltip.background`                                | Bare `tooltip` loses to `.background` on specificity; fill never lands         |
| Menus           | `menu`, `menuitem`              | `popover.menu`, `modelbutton`                       | GtkMenu was removed; both selectors match nothing                              |
| Menubar items   | `menubar > menuitem`            | `menubar > item`                                    | Menubar items stay unthemed                                                    |
| Toolbars        | `toolbar`                       | `.toolbar` class only                               | GtkToolbar was removed; no `toolbar` element exists                            |
| Popover fill    | `popover`                       | `popover > contents` (and `> arrow`)                | The fill lands on the shadow-carrying outer node, not the visible surface      |
| Entry text      | `entry`                         | `entry`, plus `entry > text`                        | Caret and placeholder live on the `text` child                                 |
| Entry focus     | `entry:focus`                   | `entry:focus-within`                                | Focus ring never appears                                                       |
| Scale parts     | `scale trough`, `scale slider`  | `scale > trough`, `scale > trough > slider`         | Descendant form still matches; the child form is what GTK4 itself uses         |
| Text view       | `textview text`                 | `textview > text`                                   | Descendant form still matches                                                  |
| Tree expander   | `treeview expander`             | `treeview.view.expander`, `treeexpander > expander` | Arrow renders as an empty indent                                               |
| Level bar       | `levelbar block`                | `levelbar > trough > block`                         | Descendant form still matches                                                  |
| Sidebar rows    | `.sidebar`, `placessidebar`     | those **plus** `.navigation-sidebar` (GTK4-only)    | Modern GTK4/libadwaita sidebars — the most visible widget — stay unstyled      |
| Filled level    | `block:not(.empty)`             | `block:not(.empty)` — **no `.filled` class exists** | `block.filled` matches nothing in GTK3 _or_ GTK4; mid-range bars draw no fill  |
| Spinner         | icon-source + `:checked` toggle | identical in GTK4                                   | Colour alone yields an invisible box — `opacity: 0` is the upstream base       |

**`background-image` composites over `background-color` — again.** Phase 2 established this for GTK3 paned handles. GTK4's default sets `paned > separator { background-image: image(#1b1b1b); }` explicitly, so `background-image: none` is required alongside the colour here too. This is verified in the extract, not carried over on faith.

**Arrow glyphs still need an explicit icon source.** GTK4's default supplies `-gtk-icon-source: -gtk-icontheme("pan-end-symbolic")` for expander arrows. A theme _replaces_ that stylesheet, so every arrow node needs the icon named or it renders as an empty indent. Setting `color` alone can never fix it — there is no glyph to tint.

**But not every glyph can be named that way, and this part is not obvious.** Two different resource trees are involved, and only one is reachable from a theme that ships no assets of its own:

| Glyph                                           | Where GTK4 keeps it                       | Reachable via `-gtk-icontheme()`? |
| ----------------------------------------------- | ----------------------------------------- | --------------------------------- |
| `pan-end` / `pan-down` / `pan-start` / `pan-up` | `/org/gtk/libgtk/icons/scalable/actions/` | **Yes** — a real icon-theme icon  |
| `object-select`                                 | `/org/gtk/libgtk/icons/scalable/actions/` | **Yes**                           |
| `check-symbolic`                                | `/org/gtk/libgtk/theme/Default/assets/`   | **No** — private to that theme    |
| `bullet-symbolic`                               | `/org/gtk/libgtk/theme/Default/assets/`   | **No**                            |
| `dash-symbolic`                                 | `/org/gtk/libgtk/theme/Default/assets/`   | **No**                            |

GTK4's default draws a checkbox tick and a radio dot with `url("assets/check-symbolic.symbolic.png")` and `url("assets/bullet-symbolic.symbolic.png")` — theme-relative paths that resolve inside GTK's own theme directory and nowhere else. Copying those lines into our stylesheet yields a broken reference, and `-gtk-icontheme("check-symbolic")` does not resolve either, because the asset was never registered as an icon.

Consequences, both applied in Task 6:

- The **tick** substitutes `object-select-symbolic`, the standard freedesktop name for a checkmark, which is in GTK's icon theme and so adds no icon dependency.
- The **dot** has no icon-theme equivalent at all — there is no bullet or circle glyph anywhere in that tree — so it is drawn in CSS with an inset ring rather than sourced. Do not go looking for `radio-symbolic`; it does not exist.

Check the claim rather than trusting this table if a glyph misbehaves. Anything under `icons/` is nameable; anything under `theme/` is not:

```bash
gresource list "$S/gtk.gresource" | grep -E '/(check|bullet|object-select|pan-end)-symbolic'
```

## Reference: the GTK2 binding vocabulary

GTK2 has no CSS nodes. Coverage is a matter of which **widget classes** carry a style and how that style is bound. The vocabulary below was read from `/usr/share/themes/Adwaita/gtk-2.0/main.rc` — again as an inventory of what GTK2 exposes, never as a source of values.

Bindings that matter for an engine-free colour theme:

| Binding                                       | Reaches                                                     |
| --------------------------------------------- | ----------------------------------------------------------- |
| `class "GtkWidget"`                           | the global fallback every other style overrides             |
| `class "GtkButton"`                           | buttons everywhere                                          |
| `class "GtkEntry"`                            | text fields                                                 |
| `class "GtkFrame"`                            | framed sections                                             |
| `class "GtkMenu"` / `class "GtkMenuBar"`      | menu surfaces                                               |
| `widget_class "*<GtkMenuItem>*"`              | menu entries and their prelight                             |
| `widget_class "*<GtkMenuBar>.<GtkMenuItem>*"` | menubar entries specifically                                |
| `widget_class "*<GtkSeparatorMenuItem>*"`     | rules between menu groups                                   |
| `class "GtkNotebook"`                         | tab strips                                                  |
| `class "GtkProgressBar"`                      | progress bars                                               |
| `class "GtkTextView"`                         | document surfaces                                           |
| `class "GtkScrolledWindow"`                   | the viewport surface                                        |
| `class "GtkHScale"` / `class "GtkVScale"`     | sliders (GTK2 has no single `GtkScale` binding in practice) |
| `widget_class "*<GtkTreeView>*<GtkButton>*"`  | tree-view column headers                                    |
| `widget_class "*<GtkToolbar>*<GtkButton>"`    | toolbar buttons                                             |
| `widget_class "*<GtkComboBox>.<GtkButton>"`   | combo-box buttons                                           |
| `widget "gtk-tooltip*"`                       | tooltips (GTK 2.12+; a `widget` match, not a `class` one)   |

`gtk-color-scheme` keys GTK2 reads beyond the five we set today: `insensitive_fg_color`, `insensitive_bg_color`, `menu_color`, `tooltip_fg_color`, `tooltip_bg_color`, `link_color`, `visited_link_color`. Setting these is the cheapest coverage GTK2 has, because apps and the default engine read them directly.

**Ordering rule.** A `style` block must be _defined_ before it is _bound_, and for the same widget a later binding wins. `widget_class` matches beat `class` matches regardless of order. This is why cascade order is part of the GTK2 index's contract exactly as it is for GTK3.

## Verified contrast data

Measured across all 24 combinations before this plan was written, with `tools/lib/contrast.mjs`. **Use this table instead of re-deriving.**

| Pair                             | Worst ratio | Worst case   | Verdict                          |
| -------------------------------- | ----------- | ------------ | -------------------------------- |
| `fg` on `bg_sunk`                | 9.54:1      | dawn red     | safe                             |
| `fg` on `bg`                     | 9.51:1      | twilight red | safe                             |
| `fg` on `bg_soft`                | 7.17:1      | twilight red | safe                             |
| `fg` on `bg_overlay`             | 7.17:1      | twilight red | safe                             |
| `fg_muted` on `bg_sunk`          | 5.52:1      | dawn red     | safe                             |
| `fg_muted` on `bg_overlay`       | 5.27:1      | twilight red | safe                             |
| `accentOn` on `accent`           | 4.75:1      | noon orange  | safe for any accent fill         |
| `accent` on `bg`                 | 4.52:1      | dawn blue    | safe                             |
| `control.border` on `bg`         | 4.11:1      | twilight red | safe                             |
| `fg_subtle` on `bg`              | 3.78:1      | midnight red | non-text only                    |
| `accent` on `bg_sunk`            | 3.49:1      | noon orange  | clears 3:1; tightest fill pair   |
| `control.border` on `bg_sunk`    | 3.20:1      | noon red     | clears 3:1                       |
| `control.border` on `bg_soft`    | 3.10:1      | twilight red | clears 3:1; tightest border pair |
| `control.border` on `bg_overlay` | 3.10:1      | twilight red | clears 3:1                       |

Phase 2's two FAIL rows still hold and still constrain design here: **`accent` on `bg_soft` and on `bg_overlay` are 2.76:1 on Midnight Red.** No accent mark on a chrome or menu surface. Where a selected affordance is needed there, fill the row with `accent` and put `accentOn` on top.

`control.border` resolves per flavor as: Midnight `text.fg_muted` `#d4d4d4`, Twilight `text.fg_subtle` `#a3a3a3`, Dawn `border.strong` `#404040`, Noon `border.strong` `#737373`.

---

### Task 1: Split GTK4 into modules — byte-identical

A pure refactor. This is the only kind of change whose correctness is provable mechanically, and the proof is the point: everything after it is judged visually.

**Files:**

- Create: `tools/templates/gtk4/_tokens.mjs`, `base.mjs`, `button.mjs`, `entry.mjs`, `check-radio.mjs`, `header-bars.mjs`, `scrollbar.mjs`, `progress.mjs`, `tooltip.mjs`
- Modify: `tools/templates/gtk4.mjs`, `tools/templates/gtk4.test.mjs`

**Interfaces:**

- Consumes: `buildContext` from `tools/templates/context.mjs`
- Produces: `GTK4_MODULES` (array of module namespace objects) exported from `tools/templates/gtk4.mjs`; each module exports `render(ctx)` and `contrastPairs(ctx)`

- [ ] **Step 1: Prove the tree is clean before touching it**

Run: `npm run check`
Expected: `Generated output matches tokens — no drift.`

If it reports drift, stop. A dirty baseline makes the byte-identity proof in Step 8 meaningless — you would not be able to tell your refactor from pre-existing drift.

- [ ] **Step 2: Capture the current GTK4 output as the reference**

```bash
cp gtk-4.0/vivid-life-midnight-blue/gtk.css /tmp/gtk4-before-midnight-blue.css
cp gtk-4.0/vivid-life-noon-red/gtk.css /tmp/gtk4-before-noon-red.css
```

One dark and one light flavor. `npm run check` covers all 24 anyway; these two are for reading a diff by eye if it fails.

- [ ] **Step 3: Write the nine module files**

Each is a verbatim slice of today's `gtk4.mjs` template literal, with `${...}` interpolations rewritten to read from `ctx`. Create `tools/templates/gtk4/_tokens.mjs`:

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
@define-color vl_success ${ctx.semantic.success};
@define-color vl_warning ${ctx.semantic.warning};
@define-color vl_danger ${ctx.semantic.danger};
@define-color vl_info ${ctx.semantic.info};`;
}
```

Create `tools/templates/gtk4/base.mjs`:

```js
export function render() {
  return `window,
.background {
  background-color: @vl_bg;
  color: @vl_fg;
}`;
}

export function contrastPairs(ctx) {
  return [
    { label: "window text", fg: ctx.text.fg, bg: ctx.surface.bg, rule: "text" },
  ];
}
```

Create `tools/templates/gtk4/button.mjs`:

```js
export function render() {
  return `button {
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
}`;
}

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
      bg: ctx.border.default,
      rule: "text",
    },
    {
      label: "active button label",
      fg: ctx.accentOn,
      bg: ctx.accent,
      rule: "text",
    },
  ];
}
```

Create `tools/templates/gtk4/entry.mjs`:

```js
export function render() {
  return `entry {
  background-color: @vl_bg_sunk;
  color: @vl_fg;
  border: 1px solid @vl_border;
  border-radius: 4px;
  padding: 4px 6px;
}

entry:focus {
  border-color: @vl_accent;
}`;
}

export function contrastPairs(ctx) {
  return [
    {
      label: "entry text",
      fg: ctx.text.fg,
      bg: ctx.surface.bg_sunk,
      rule: "text",
    },
  ];
}
```

Create `tools/templates/gtk4/check-radio.mjs`:

```js
export function render() {
  return `check,
radio {
  background-color: @vl_bg_soft;
  border: 1px solid @vl_border;
}

check:checked,
radio:checked {
  background-color: @vl_accent;
  border-color: @vl_accent;
  color: @vl_accent_on;
}`;
}

export function contrastPairs(ctx) {
  return [
    {
      label: "checked indicator glyph",
      fg: ctx.accentOn,
      bg: ctx.accent,
      rule: "nontext",
    },
  ];
}
```

Create `tools/templates/gtk4/header-bars.mjs`:

```js
export function render() {
  return `headerbar {
  background-color: @vl_bg_soft;
  color: @vl_fg;
  border-bottom: 1px solid @vl_border;
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
  ];
}
```

Create `tools/templates/gtk4/scrollbar.mjs`:

```js
export function render() {
  return `scrollbar slider {
  /* border.strong fails WCAG 1.4.11 (3:1, non-text UI) against surface.bg
     on Twilight (1.909:1) — text.fg_subtle clears 3:1 on all four flavors. */
  background-color: @vl_fg_subtle;
  border-radius: 6px;
  min-width: 6px;
  min-height: 6px;
}

scrollbar slider:hover {
  background-color: @vl_accent;
}`;
}

export function contrastPairs(ctx) {
  return [
    {
      label: "scrollbar slider",
      fg: ctx.text.fg_subtle,
      bg: ctx.surface.bg,
      rule: "nontext",
    },
  ];
}
```

Create `tools/templates/gtk4/progress.mjs`:

```js
export function render() {
  return `progressbar > trough {
  background-color: @vl_bg_sunk;
  border-radius: 4px;
}

progressbar > trough > progress {
  background-color: @vl_accent;
  border-radius: 4px;
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
  ];
}
```

Create `tools/templates/gtk4/tooltip.mjs`:

```js
export function render() {
  return `tooltip {
  background-color: @vl_bg_overlay;
  color: @vl_fg;
  border: 1px solid @vl_border;
}`;
}

export function contrastPairs(ctx) {
  return [
    {
      label: "tooltip text",
      fg: ctx.text.fg,
      bg: ctx.surface.bg_overlay,
      rule: "text",
    },
  ];
}
```

- [ ] **Step 4: Rewrite the index**

Replace `tools/templates/gtk4.mjs` with:

```js
import { buildContext } from "./context.mjs";
import * as tokens from "./gtk4/_tokens.mjs";
import * as base from "./gtk4/base.mjs";
import * as button from "./gtk4/button.mjs";
import * as entry from "./gtk4/entry.mjs";
import * as checkRadio from "./gtk4/check-radio.mjs";
import * as headerBars from "./gtk4/header-bars.mjs";
import * as scrollbar from "./gtk4/scrollbar.mjs";
import * as progress from "./gtk4/progress.mjs";
import * as tooltip from "./gtk4/tooltip.mjs";

// Cascade order is part of the contract, same as gtk3.mjs: _tokens first so
// the @define-color names exist before any rule references them, then base
// so per-widget rules override it.
export const GTK4_MODULES = [
  tokens,
  base,
  button,
  entry,
  checkRadio,
  headerBars,
  scrollbar,
  progress,
  tooltip,
];

// GTK4's own default stylesheet is the node-name reference for this target;
// see the phase 4 plan for how to extract it. GTK3 selectors do not transfer
// unchanged — frame, expander, tooltip, popover and menubar all differ.
const HEADER = `/* Generated by tools/generate.mjs — do not edit by hand.
 *
 * GTK4 limitation: apps built on libadwaita largely ignore this
 * stylesheet and follow libadwaita's own accent-color system instead.
 * This file only affects GTK4 apps that render plain GTK4 widgets
 * without opting into libadwaita theming. See
 * docs/superpowers/specs/2026-08-30-xfce-theme-port-design.md.
 */`;

export function renderGtk4Css(flavorBlock, accentHex, accentOnHex) {
  const ctx = buildContext(flavorBlock, accentHex, accentOnHex);
  const fragments = GTK4_MODULES.map((module) => module.render(ctx));
  return `${HEADER}

${fragments.join("\n\n")}
`;
}
```

- [ ] **Step 5: Add the registry tests**

Append to `tools/templates/gtk4.test.mjs`:

```js
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GTK4_MODULES } from "./gtk4.mjs";

// A module file that exists but is never composed produces no CSS and no
// error — exactly the silent gap the module split could otherwise introduce.
test("every module file in gtk4/ is composed by the index", async () => {
  const dir = fileURLToPath(new URL("./gtk4/", import.meta.url));
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".mjs") && !f.endsWith(".test.mjs"));
  const composed = new Set(
    await Promise.all(
      GTK4_MODULES.map(async (m) => {
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
      `gtk4/${file} exists but is not in GTK4_MODULES`,
    );
  }
});

test("every composed gtk4 module exports a render function", () => {
  for (const module of GTK4_MODULES) {
    assert.equal(typeof module.render, "function");
  }
});
```

Note the existing `import { renderGtk4Css } from "./gtk4.mjs";` at the top of that file — merge the `GTK4_MODULES` import into it rather than adding a second import of the same module.

- [ ] **Step 6: Run the target's tests, and prove the new pairs are reachable**

Run: `node --test tools/templates/gtk4.test.mjs tools/aa.test.mjs`
Expected: PASS.

That PASS is weaker than it looks, and you need to know why. The gate does not walk `GTK4_MODULES` until Task 3, and `aa.test.mjs` still carries hardcoded gtk2/gtk4 pairs that duplicate what these modules now declare. Duplicates do not fail, so a typo inside any `contrastPairs` you just wrote would go green here and only surface three tasks later. Call them directly instead:

```bash
node -e '
import("./tools/templates/gtk4.mjs").then(async (m) => {
  const T = await import("./tools/lib/tokens.mjs");
  const { buildContext } = await import("./tools/templates/context.mjs");
  const ctx = buildContext(
    T.flavorBlock("midnight"),
    T.resolveAccent("midnight", "blue"),
    T.accentOn("midnight"),
  );
  const pairs = m.GTK4_MODULES.flatMap((x) =>
    x.contrastPairs ? x.contrastPairs(ctx) : [],
  );
  console.log(pairs.length, "pairs");
  if (pairs.length < 5) process.exit(1);
});'
```

Expected: `10 pairs`. `_tokens.mjs` deliberately exports no `contrastPairs` — the walk guards for that — so eight modules contribute the ten. A number below 5 fails the floor Task 3 Step 1 asserts; a crash names the module with the bad export.

- [ ] **Step 7: Prove the output did not move**

Run: `npm run check`
Expected: `Generated output matches tokens — no drift.`

**Do not run `npm run generate` before this.** Generating would overwrite the committed files with your refactor's output and destroy the only evidence the refactor was neutral. `check` renders to a temp tree and byte-compares — that is the proof.

If it reports drift, diff against the reference from Step 2:

```bash
node -e '
import("./tools/templates/gtk4.mjs").then(async (m) => {
  const T = await import("./tools/lib/tokens.mjs");
  process.stdout.write(m.renderGtk4Css(T.flavorBlock("midnight"), T.resolveAccent("midnight","blue"), T.accentOn("midnight")));
});' > /tmp/gtk4-after-midnight-blue.css
diff /tmp/gtk4-before-midnight-blue.css /tmp/gtk4-after-midnight-blue.css
```

Whitespace is the usual culprit: the join is `"\n\n"`, each module's string has no trailing newline, and the file ends with exactly one.

- [ ] **Step 8: Commit**

```bash
git add tools/templates/gtk4.mjs tools/templates/gtk4/ tools/templates/gtk4.test.mjs
git commit -m "♻️ refactor: split the GTK4 template into per-widget modules

A pure refactor: npm run check confirms all 24 generated stylesheets are
byte-identical. Splitting before extending is what makes the coverage work
that follows reviewable — every later diff is a visual change and nothing
else."
```

---

### Task 2: Split GTK2 into modules — byte-identical

Same lever, second target.

**A deliberate contract decision.** gtkrc does not cascade the way CSS does: a `style` block must be defined before it is bound, and bindings — not definitions — are what compete. The obvious response is to give GTK2 modules a different contract (`styles(ctx)` plus `bindings(ctx)`, with the index emitting all styles then all bindings). **Do not do that.** Today's `gtk2.mjs` already interleaves each style with the binding that uses it, so a style/binding split would not be byte-identical, and interleaving already satisfies define-before-bind within each module. GTK2 therefore keeps the _same_ `render(ctx)` contract as GTK3 and GTK4. Cascade order still matters and is still part of the index's contract — for GTK2 it governs which binding wins, not which declaration does.

**Files:**

- Create: `tools/templates/gtk2/_tokens.mjs`, `base.mjs`, `button.mjs`, `entry.mjs`
- Modify: `tools/templates/gtk2.mjs`, `tools/templates/gtk2.test.mjs`

**Interfaces:**

- Consumes: `buildContext` from `tools/templates/context.mjs`
- Produces: `GTK2_MODULES` exported from `tools/templates/gtk2.mjs`; each module exports `render(ctx)` and optionally `contrastPairs(ctx)`

- [ ] **Step 1: Capture the reference and confirm the tree is clean**

```bash
npm run check
cp gtk-2.0/vivid-life-noon-red/gtkrc /tmp/gtk2-before-noon-red
```

Expected: `Generated output matches tokens — no drift.`

- [ ] **Step 2: Write the four module files**

Create `tools/templates/gtk2/_tokens.mjs`:

```js
export function render(ctx) {
  return `gtk-color-scheme = "bg_color:${ctx.surface.bg}\\nfg_color:${ctx.text.fg}\\nbase_color:${ctx.surface.bg_sunk}\\ntext_color:${ctx.text.fg}\\nselected_bg_color:${ctx.accent}\\nselected_fg_color:${ctx.accentOn}"`;
}
```

Create `tools/templates/gtk2/base.mjs`:

```js
export function render(ctx) {
  return `style "vivid-life-default" {
  bg[NORMAL]      = "${ctx.surface.bg}"
  bg[PRELIGHT]    = "${ctx.surface.bg_soft}"
  bg[ACTIVE]      = "${ctx.accent}"
  bg[SELECTED]    = "${ctx.accent}"
  bg[INSENSITIVE] = "${ctx.surface.bg_soft}"

  fg[NORMAL]      = "${ctx.text.fg}"
  fg[PRELIGHT]    = "${ctx.text.fg}"
  fg[ACTIVE]      = "${ctx.accentOn}"
  fg[SELECTED]    = "${ctx.accentOn}"
  fg[INSENSITIVE] = "${ctx.text.fg_disabled}"

  base[NORMAL]    = "${ctx.surface.bg_sunk}"
  base[SELECTED]  = "${ctx.accent}"

  text[NORMAL]    = "${ctx.text.fg}"
  text[SELECTED]  = "${ctx.accentOn}"

  xthickness = 1
  ythickness = 1
}

class "GtkWidget" style "vivid-life-default"`;
}

export function contrastPairs(ctx) {
  return [
    { label: "window text", fg: ctx.text.fg, bg: ctx.surface.bg, rule: "text" },
    {
      label: "selected text",
      fg: ctx.accentOn,
      bg: ctx.accent,
      rule: "text",
    },
  ];
}
```

Create `tools/templates/gtk2/button.mjs`:

```js
export function render(ctx) {
  return `style "vivid-life-button" {
  bg[NORMAL]   = "${ctx.surface.bg_soft}"
  bg[PRELIGHT] = "${ctx.border.default}"
  bg[ACTIVE]   = "${ctx.accent}"
  fg[ACTIVE]   = "${ctx.accentOn}"
}

class "GtkButton" style "vivid-life-button"`;
}

export function contrastPairs(ctx) {
  return [
    {
      label: "button label",
      fg: ctx.text.fg,
      bg: ctx.surface.bg_soft,
      rule: "text",
    },
    {
      label: "button prelight label",
      fg: ctx.text.fg,
      bg: ctx.border.default,
      rule: "text",
    },
  ];
}
```

Create `tools/templates/gtk2/entry.mjs`:

```js
export function render(ctx) {
  return `style "vivid-life-entry" {
  base[NORMAL] = "${ctx.surface.bg_sunk}"
  text[NORMAL] = "${ctx.text.fg}"
}

class "GtkEntry" style "vivid-life-entry"`;
}

export function contrastPairs(ctx) {
  return [
    {
      label: "entry text",
      fg: ctx.text.fg,
      bg: ctx.surface.bg_sunk,
      rule: "text",
    },
  ];
}
```

- [ ] **Step 3: Rewrite the index**

Replace `tools/templates/gtk2.mjs` with:

```js
import { buildContext } from "./context.mjs";
import * as tokens from "./gtk2/_tokens.mjs";
import * as base from "./gtk2/base.mjs";
import * as button from "./gtk2/button.mjs";
import * as entry from "./gtk2/entry.mjs";

// Cascade order is part of the contract, but it means something different
// here than in CSS. gtkrc requires a style to be defined before it is bound,
// which each module satisfies internally by emitting its style and its
// binding together. What order decides is which *binding* wins: for the same
// widget the last binding applies, and a widget_class match beats a class
// match regardless of position. _tokens first because gtk-color-scheme has
// to be set before any style references its names; base second because
// GtkWidget is the fallback every later binding narrows.
export const GTK2_MODULES = [tokens, base, button, entry];

export function renderGtk2Gtkrc(flavorBlock, accentHex, accentOnHex) {
  const ctx = buildContext(flavorBlock, accentHex, accentOnHex);
  const fragments = GTK2_MODULES.map((module) => module.render(ctx));
  return `# Generated by tools/generate.mjs — do not edit by hand.

${fragments.join("\n\n")}
`;
}
```

- [ ] **Step 4: Add the registry tests**

Append to `tools/templates/gtk2.test.mjs`, merging the `GTK2_MODULES` import into the existing `./gtk2.mjs` import line:

```js
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

test("every module file in gtk2/ is composed by the index", async () => {
  const dir = fileURLToPath(new URL("./gtk2/", import.meta.url));
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".mjs") && !f.endsWith(".test.mjs"));
  const composed = new Set(
    await Promise.all(
      GTK2_MODULES.map(async (m) => {
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
      `gtk2/${file} exists but is not in GTK2_MODULES`,
    );
  }
});

// gtkrc is order-sensitive in a way CSS is not: a style referenced before it
// is defined is a parse error GTK2 reports to stderr and then ignores, so the
// theme silently loses that style. Asserting the order mechanically is
// cheaper than noticing a missing style in a screenshot.
test("every style is defined before the binding that references it", () => {
  const gtkrc = renderGtk2Gtkrc(
    flavorBlock("noon"),
    resolveAccent("noon", "red"),
    accentOn("noon"),
  );
  const defined = new Set();
  for (const line of gtkrc.split("\n")) {
    const declaration = line.match(/^style "([^"]+)"/);
    if (declaration) {
      defined.add(declaration[1]);
      continue;
    }
    const binding = line.match(
      /^(?:class|widget_class|widget) "[^"]+" style "([^"]+)"/,
    );
    if (binding) {
      assert.ok(
        defined.has(binding[1]),
        `binding references style "${binding[1]}" before it is defined`,
      );
    }
  }
  assert.ok(defined.size >= 3, "no styles found — the composition lost them");
});
```

- [ ] **Step 5: Run the target's tests, and prove the new pairs are reachable**

Run: `node --test tools/templates/gtk2.test.mjs tools/aa.test.mjs`
Expected: PASS — and weak for the same reason as Task 1 Step 6: the gate does not walk `GTK2_MODULES` until Task 3, so a typo in a `contrastPairs` here passes silently. Call them directly:

```bash
node -e '
import("./tools/templates/gtk2.mjs").then(async (m) => {
  const T = await import("./tools/lib/tokens.mjs");
  const { buildContext } = await import("./tools/templates/context.mjs");
  const ctx = buildContext(
    T.flavorBlock("midnight"),
    T.resolveAccent("midnight", "blue"),
    T.accentOn("midnight"),
  );
  const pairs = m.GTK2_MODULES.flatMap((x) =>
    x.contrastPairs ? x.contrastPairs(ctx) : [],
  );
  console.log(pairs.length, "pairs");
  if (pairs.length < 3) process.exit(1);
});'
```

Expected: `5 pairs` — two from `base.mjs`, two from `button.mjs`, one from `entry.mjs`; `_tokens.mjs` contributes none at this stage.

- [ ] **Step 6: Prove the output did not move**

Run: `npm run check`
Expected: `Generated output matches tokens — no drift.` Again: do not run `npm run generate` first.

- [ ] **Step 7: Commit**

```bash
git add tools/templates/gtk2.mjs tools/templates/gtk2/ tools/templates/gtk2.test.mjs
git commit -m "♻️ refactor: split the GTK2 template into per-widget modules

Byte-identical, proven by npm run check. GTK2 keeps the same render(ctx)
contract as GTK3 and GTK4 rather than gaining a styles/bindings split: the
template already emits each style beside the binding that uses it, which
satisfies gtkrc's define-before-bind rule without a second export."
```

---

### Task 3: Generalize the contrast gate over all three targets

The gate currently walks `GTK3_MODULES` and carries five hardcoded gtk2/gtk4 pairs, because those targets were not modularized. They are now. Leaving the hardcoded list in place would let a GTK4 module ship a colour the gate has never seen — and would leave a second copy of the same claim to rot, exactly as the file's own comment admits happened to the xfwm4 pairs.

**Files:**

- Modify: `tools/aa.test.mjs`

**Interfaces:**

- Consumes: `GTK3_MODULES`, `GTK4_MODULES` (Task 1), `GTK2_MODULES` (Task 2)
- Produces: no new exports; `modulePairsFor(flavor, variant)` replaces `gtkPairsFor` internally

- [ ] **Step 1: Write the failing test**

Add to `tools/aa.test.mjs`, after the existing `the module walk covers both WCAG criteria` test:

```js
// A registry that lost its contrastPairs — or a target whose modules were
// never wired into the walk — would make this file pass vacuously for that
// target while it shipped ungated colours.
test("every target registry contributes pairs", () => {
  const counts = registryPairCounts("midnight", "blue");
  assert.ok(counts.gtk3 >= 15, `gtk3 yielded ${counts.gtk3} pairs`);
  assert.ok(counts.gtk4 >= 5, `gtk4 yielded ${counts.gtk4} pairs`);
  assert.ok(counts.gtk2 >= 3, `gtk2 yielded ${counts.gtk2} pairs`);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node --test tools/aa.test.mjs`
Expected: FAIL — `registryPairCounts is not defined`.

- [ ] **Step 3: Replace the walk**

In `tools/aa.test.mjs`, change the imports to bring in all three registries:

```js
import { GTK3_MODULES } from "./templates/gtk3.mjs";
import { GTK4_MODULES } from "./templates/gtk4.mjs";
import { GTK2_MODULES } from "./templates/gtk2.mjs";
```

Replace the `gtkPairsFor` function with:

```js
const REGISTRIES = {
  gtk3: GTK3_MODULES,
  gtk4: GTK4_MODULES,
  gtk2: GTK2_MODULES,
};

function contextFor(flavor, variant) {
  return buildContext(
    flavorBlock(flavor),
    resolveAccent(flavor, variant),
    accentOn(flavor),
  );
}

// Every template module declares the pairs it emits next to the CSS that
// emits them, and this walk collects them across all three targets — so a
// new widget module cannot ship colours the gate has never seen.
//
// Labels are prefixed with their target. gtk3/base.mjs and gtk4/base.mjs
// both emit a pair called "window text"; without the prefix the exemption
// map below would collapse two targets' claims into one key and stop
// noticing when only one of them goes stale.
function modulePairsFor(flavor, variant) {
  const ctx = contextFor(flavor, variant);
  return Object.entries(REGISTRIES).flatMap(([target, modules]) =>
    modules.flatMap((m) =>
      m.contrastPairs
        ? m
            .contrastPairs(ctx)
            .map((p) => ({ ...p, label: `${target}: ${p.label}` }))
        : [],
    ),
  );
}

function registryPairCounts(flavor, variant) {
  const ctx = contextFor(flavor, variant);
  return Object.fromEntries(
    Object.entries(REGISTRIES).map(([target, modules]) => [
      target,
      modules.flatMap((m) => (m.contrastPairs ? m.contrastPairs(ctx) : []))
        .length,
    ]),
  );
}
```

- [ ] **Step 4: Drop the hardcoded gtk2/gtk4 pairs**

In `otherPairsFor`, delete these five lines and the comment above them:

```js
    // gtk2/gtk4 only — the gtk3 equivalents come from the module walk.
    text("gtk2/gtk4 window text", b.text.fg, b.surface.bg),
    text("gtk2/gtk4 button text", b.text.fg, b.surface.bg_soft),
    text("gtk2/gtk4 entry text", b.text.fg, sunk),
    text("gtk2/gtk4 button prelight", b.text.fg, b.border.default),
    text("gtk2/gtk4 accent button text", accentOn(flavor), accent),
```

Every one is now declared by the module that emits it, in `gtk4/base.mjs`, `gtk4/button.mjs`, `gtk4/entry.mjs`, `gtk2/base.mjs`, `gtk2/button.mjs` and `gtk2/entry.mjs`. Update the function's leading comment, which now describes only xfwm4:

```js
// xfwm4.mjs is not split into modules, so its pairs stay an explicit list.
function otherPairsFor(flavor, variant) {
```

The `accent` local becomes unused once the last line goes; delete its declaration too, and `resolveAccent` stays imported because `contextFor` uses it.

- [ ] **Step 5: Rename the remaining call sites**

Three tests still call `gtkPairsFor`. Rename each to `modulePairsFor`:

- the main `WCAG — ${flavor} ${variant}` loop
- `every exemption is still needed`
- `the module walk yields pairs for every flavor and variant`
- `the module walk covers both WCAG criteria`

In `the module walk yields pairs for every flavor and variant`, raise the threshold from `15` to `25` — the walk now covers three targets, so the old floor no longer catches a target dropping out. (`every target registry contributes pairs` is what catches a specific target; this one catches the walk collapsing entirely.)

- [ ] **Step 6: Run the gate**

Run: `node --test tools/aa.test.mjs`
Expected: PASS, including the new registry test.

The exemption test is the one to watch. Its keys are now target-prefixed, so a previously-recorded exemption whose label changed will not silently vanish — it will simply be listed under its new name. Confirm the test still finds exemptions rather than failing with `no exempt pairs found`.

- [ ] **Step 7: Confirm no generated output moved**

Run: `npm run check`
Expected: `Generated output matches tokens — no drift.` This task touches only a test file; any drift means you edited a template by accident.

- [ ] **Step 8: Commit**

```bash
git add tools/aa.test.mjs
git commit -m "✅ test: gate every target's colours, not just GTK3

The five hardcoded gtk2/gtk4 pairs existed because those targets were not
modularized. They are now, so the pairs move next to the rules that emit
them and the walk covers all three registries. Labels carry their target:
gtk3 and gtk4 both emit a pair named window text, and an unprefixed
exemption map would collapse the two."
```

---

### Task 4: The GTK4 preview harness

Phase 3's lesson was that contact-sheet review after every module caught four defects that all looked plausible in isolation. GTK4 gets the same instrument or its coverage is unreviewable.

**GTK3 and GTK4 cannot share a process.** `gi.require_version` pins one GTK major version per interpreter, and importing both raises. So this is a second script, `gallery4.py`, not a flag on `gallery.py`. Do not try to merge them.

**Files:**

- Create: `tools/preview/gallery4.py`, `tools/preview/shots4.sh`
- Modify: `package.json`, `README.md`

**Interfaces:**

- Consumes: nothing from Tasks 1–3
- Produces: `npm run preview:gtk4` and `npm run preview:shots4`; PNGs at `tools/preview/out/gtk4-<theme>.png`

- [ ] **Step 1: Install the optional dependencies**

This is the one step in this plan that installs system packages. **Run it yourself — do not run `apt` unprompted on the user's behalf.**

```bash
sudo apt install gir1.2-gtk-4.0 gtk-4-examples
```

Then confirm both:

```bash
/usr/bin/python3 -c "import gi; gi.require_version('Gtk','4.0'); from gi.repository import Gtk; print('gtk4 bindings OK')"
command -v gtk4-widget-factory
```

If you decline to install them, every later task still works — the scripts skip cleanly. Task 10 Step 3 then records the GTK4 visual review as not performed rather than claiming it passed, following the phase 2 Task 2 precedent.

- [ ] **Step 2: Write the GTK4 gallery**

Create `tools/preview/gallery4.py`:

```python
#!/usr/bin/python3
"""Renders every themed GTK4 widget in one window, for visual review.

Must run under /usr/bin/python3 — the Homebrew python3 on PATH has no gi.

Separate from gallery.py because gi.require_version pins one GTK major
version per interpreter: GTK3 and GTK4 cannot be imported into the same
process, so a shared script is not possible even in principle.

The sections mirror gallery.py's so the two contact sheets can be read
side by side, but the widgets differ where GTK4 removed or renamed one.
"""

import argparse
import sys

try:
    import gi

    gi.require_version("Gtk", "4.0")
    from gi.repository import Gtk, GLib
except (ImportError, ValueError):
    sys.exit(
        "gallery4.py needs PyGObject with GTK 4 bindings.\n"
        "Install them with: sudo apt install gir1.2-gtk-4.0\n"
        "Run it with /usr/bin/python3, not the python3 on PATH."
    )


def section(title):
    """A titled frame; every widget group in the gallery sits in one."""
    frame = Gtk.Frame(label=title)
    box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=6)
    box.set_margin_top(10)
    box.set_margin_bottom(10)
    box.set_margin_start(10)
    box.set_margin_end(10)
    frame.set_child(box)
    return frame, box


def row(*widgets, spacing=8):
    box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=spacing)
    for widget in widgets:
        box.append(widget)
    return box


def label(text, *style_classes):
    widget = Gtk.Label(label=text, xalign=0)
    for name in style_classes:
        widget.add_css_class(name)
    return widget


def surfaces_section():
    frame, box = section("Surfaces")
    # A flat set of panes here means the surface ramp collapsed — the exact
    # defect the GTK3 sweep opened with.
    for name in ("background", "view", "frame"):
        pane = Gtk.Box(orientation=Gtk.Orientation.VERTICAL)
        pane.add_css_class(name)
        pane.set_size_request(-1, 34)
        pane.append(label(f"  .{name}"))
        box.append(pane)
    box.append(Gtk.Separator())
    box.append(label("A horizontal separator sits above this line"))
    return frame


def buttons_section():
    frame, box = section("Buttons")
    normal = Gtk.Button(label="Normal")
    suggested = Gtk.Button(label="Suggested")
    suggested.add_css_class("suggested-action")
    destructive = Gtk.Button(label="Destructive")
    destructive.add_css_class("destructive-action")
    disabled = Gtk.Button(label="Disabled")
    disabled.set_sensitive(False)
    box.append(row(normal, suggested, destructive, disabled))

    linked = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL)
    linked.add_css_class("linked")
    for caption in ("One", "Two", "Three"):
        linked.append(Gtk.Button(label=caption))
    box.append(row(linked))

    # GtkToolbar was removed in GTK4; .toolbar on a box is what remains.
    toolbar = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=4)
    toolbar.add_css_class("toolbar")
    for caption in ("Open", "Save", "Undo"):
        flat = Gtk.Button(label=caption)
        flat.add_css_class("flat")
        toolbar.append(flat)
    box.append(toolbar)
    return frame


def inputs_section():
    frame, box = section("Inputs")
    entry = Gtk.Entry()
    entry.set_text("Editable text")
    placeholder = Gtk.Entry()
    placeholder.set_placeholder_text("Placeholder")
    box.append(row(entry, placeholder))

    spin = Gtk.SpinButton.new_with_range(0, 100, 1)
    spin.set_value(42)
    box.append(row(label("Spin:"), spin))

    scale = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, 0, 100, 1)
    scale.set_value(60)
    scale.set_size_request(220, -1)
    marked = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, 0, 100, 1)
    marked.set_value(35)
    marked.set_size_request(220, -1)
    for position in (0, 50, 100):
        marked.add_mark(position, Gtk.PositionType.BOTTOM, str(position))
    box.append(row(label("Scale:"), scale, marked))

    check = Gtk.CheckButton(label="Checkbox")
    check.set_active(True)
    radio = Gtk.CheckButton(label="Radio")
    radio.set_group(Gtk.CheckButton())
    radio.set_active(True)
    toggle = Gtk.Switch()
    toggle.set_active(True)
    off = Gtk.Switch()
    box.append(row(check, radio, toggle, off))

    # GtkComboBoxText is deprecated in GTK4; GtkDropDown is the replacement.
    drop = Gtk.DropDown.new_from_strings(["Midnight", "Twilight", "Dawn", "Noon"])
    box.append(row(label("Dropdown:"), drop))
    return frame


def feedback_section():
    frame, box = section("Feedback")
    progress = Gtk.ProgressBar()
    progress.set_fraction(0.62)
    box.append(progress)
    for value, caption in ((15, "low"), (50, "filled"), (90, "high")):
        level = Gtk.LevelBar.new_for_interval(0, 100)
        level.set_value(value)
        box.append(row(label(f"Level ({caption}):"), level))
    spinner = Gtk.Spinner()
    spinner.start()
    box.append(row(label("Spinner:"), spinner))
    for name in ("warning", "error", "success"):
        box.append(label(f"{name} text", name))
    return frame


def lists_section():
    frame, box = section("Lists")
    listbox = Gtk.ListBox()
    for index, caption in enumerate(("First row", "Second row", "Third row")):
        listbox.append(Gtk.Label(label=caption, xalign=0))
        if index == 1:
            listbox.select_row(listbox.get_row_at_index(1))
    box.append(listbox)

    # A tree expander is the node phase 2 proved needs an explicit icon
    # source; GTK4 renders it as treeexpander, not treeview expander.
    expander = Gtk.Expander(label="An expander, expanded")
    expander.set_expanded(True)
    expander.set_child(label("Revealed content"))
    box.append(expander)

    calendar = Gtk.Calendar()
    calendar.set_halign(Gtk.Align.START)
    box.append(calendar)
    return frame


def chrome_section():
    frame, box = section("Chrome")
    notebook = Gtk.Notebook()
    for caption in ("First", "Second", "Third"):
        notebook.append_page(label(f"  {caption} page  "), Gtk.Label(label=caption))
    notebook.set_size_request(-1, 80)
    box.append(notebook)

    paned = Gtk.Paned(orientation=Gtk.Orientation.HORIZONTAL)
    left = Gtk.Box()
    left.add_css_class("sidebar")
    left.append(label("  Sidebar pane  "))
    right = Gtk.Box()
    right.add_css_class("view")
    right.append(label("  Content pane  "))
    paned.set_start_child(left)
    paned.set_end_child(right)
    paned.set_position(160)
    paned.set_size_request(-1, 70)
    box.append(paned)
    return frame


def build_window(app):
    window = Gtk.ApplicationWindow(application=app)
    window.set_title("Vivid Life — GTK4 widget gallery")
    window.set_default_size(760, 1180)

    header = Gtk.HeaderBar()
    header.pack_end(Gtk.Button(label="Action"))
    window.set_titlebar(header)

    outer = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=10)
    outer.set_margin_top(12)
    outer.set_margin_bottom(12)
    outer.set_margin_start(12)
    outer.set_margin_end(12)
    for build in (
        surfaces_section,
        buttons_section,
        inputs_section,
        feedback_section,
        lists_section,
        chrome_section,
    ):
        outer.append(build())

    scroller = Gtk.ScrolledWindow()
    scroller.set_child(outer)
    window.set_child(scroller)
    return window


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--theme", help="theme name, for the window title only")
    parser.add_argument("--screenshot", help="write a PNG here and exit")
    args = parser.parse_args()

    app = Gtk.Application(application_id="de.vividlife.Gallery4")

    def on_activate(application):
        window = build_window(application)
        if args.theme:
            window.set_title(f"Vivid Life — GTK4 — {args.theme}")
        window.present()
        if args.screenshot:
            # GTK4 has no in-process window grab that works headlessly, so
            # the capture is left to import(1) in shots4.sh and this only
            # holds the window open long enough for it. Quitting on a timeout
            # rather than on a draw signal keeps the two scripts independent.
            GLib.timeout_add_seconds(6, lambda: application.quit() or False)

    app.connect("activate", on_activate)
    app.run([])


if __name__ == "__main__":
    main()
```

Mark it executable: `chmod +x tools/preview/gallery4.py`

- [ ] **Step 3: Write the capture script**

Create `tools/preview/shots4.sh`:

```sh
#!/bin/sh
# Captures the GTK4 gallery under all 24 themes and montages one contact
# sheet per flavor, mirroring shots.sh for the GTK3 gallery.
#
# Optional tooling: skips with a message rather than failing a fresh clone.
set -eu

here=$(dirname "$0")
out="$here/out"

if ! /usr/bin/python3 -c "import gi; gi.require_version('Gtk','4.0')" 2>/dev/null; then
  echo "preview:shots4 — skipped: GTK4 GObject bindings not installed." >&2
  echo "  (Debian/Ubuntu: sudo apt install gir1.2-gtk-4.0)" >&2
  exit 0
fi
if ! command -v xvfb-run >/dev/null 2>&1; then
  echo "preview:shots4 — skipped: xvfb-run not installed (package xvfb)." >&2
  exit 0
fi
if command -v magick >/dev/null 2>&1; then
  montage_cmd="magick montage"
  import_cmd="magick import"
elif command -v montage >/dev/null 2>&1; then
  montage_cmd="montage"
  import_cmd="import"
else
  echo "preview:shots4 — skipped: ImageMagick not installed." >&2
  exit 0
fi

# Same font resolution as shots.sh: this ImageMagick build ships no font
# configuration, so a bare -label fails with "unable to read font ''".
label_args="-label %t -pointsize 18"
font=$(fc-match -f '%{file}' sans 2>/dev/null || true)
if [ -n "$font" ] && [ -f "$font" ]; then
  label_args="$label_args -font $font"
else
  echo "preview:shots4 — no font found; contact sheets will be unlabelled." >&2
  label_args=""
fi

# Time order, not alphabetical.
flavors="midnight twilight dawn noon"
variants="red orange yellow green blue purple"

mkdir -p "$out"

for flavor in $flavors; do
  sheet_inputs=""
  for variant in $variants; do
    theme="vivid-life-$flavor-$variant"
    if [ ! -d "$HOME/.themes/$theme" ] && [ ! -d "/usr/share/themes/$theme" ]; then
      echo "preview:shots4 — skipped $theme: not installed (run ./install.sh)." >&2
      continue
    fi
    png="$out/gtk4-$theme.png"
    echo "capturing gtk4 $theme"
    xvfb-run -a --server-args="-screen 0 900x1280x24" sh -c "
      GTK_THEME=$theme /usr/bin/python3 '$here/gallery4.py' --theme '$theme' --screenshot '$png' &
      gallery_pid=\$!
      sleep 4
      $import_cmd -window root '$png'
      wait \$gallery_pid 2>/dev/null || true
    "
    sheet_inputs="$sheet_inputs $png"
  done

  [ -n "$sheet_inputs" ] || continue

  # Word splitting on both variables is deliberate — they are argument lists.
  # shellcheck disable=SC2086
  $montage_cmd $sheet_inputs $label_args -tile 3x -geometry '+8+8' \
    -background '#222222' -fill '#eeeeee' "$out/contact-gtk4-$flavor.png"
  echo "wrote $out/contact-gtk4-$flavor.png"
done
```

Mark it executable: `chmod +x tools/preview/shots4.sh`

- [ ] **Step 4: Register the npm scripts**

Add to `package.json` `scripts`, after `preview:factory`:

```json
"preview:gtk4": "/usr/bin/python3 tools/preview/gallery4.py",
"preview:shots4": "sh tools/preview/shots4.sh"
```

Note `preview:factory` needs a trailing comma once these follow it.

- [ ] **Step 5: Lint and run**

```bash
shellcheck tools/preview/shots4.sh && npm run preview:shots4
```

Expected with the bindings installed: 24 PNGs plus four `contact-gtk4-*.png` sheets in `tools/preview/out/`.
Expected without them: the skip message, exit 0, no error.

- [ ] **Step 6: Confirm the captures are not blank**

A blank grab and a working one both exit 0.

```bash
magick identify -format '%wx%h stddev=%[standard-deviation]\n' tools/preview/out/gtk4-vivid-life-midnight-blue.png
```

Expected: a non-trivial standard deviation, in the range phase 1's GTK3 captures produced (10000–28000). A near-zero value means the window had not mapped — raise the `sleep` in `shots4.sh` and re-run.

- [ ] **Step 7: Extend the factory cross-check to GTK4**

In `tools/preview/factory.sh`, the theme loop currently runs `gtk3-widget-factory`. Add a GTK4 pass after it, before the final `done`'s closing — as a separate loop so the GTK3 half keeps working when only one of the two factories is installed:

```sh
if command -v gtk4-widget-factory >/dev/null 2>&1; then
  for theme in $themes; do
    png="$out/factory4-$theme.png"
    echo "capturing gtk4 factory under $theme"
    xvfb-run -a --server-args="-screen 0 1280x1600x24" sh -c "
      GTK_THEME=$theme gtk4-widget-factory &
      factory_pid=\$!
      sleep 4
      magick import -window root '$png' 2>/dev/null || import -window root '$png'
      kill \$factory_pid 2>/dev/null || true
    "
    echo "wrote $png"
  done
else
  echo "preview:factory — gtk4-widget-factory not installed, GTK4 pass skipped" >&2
  echo "  (Debian/Ubuntu: sudo apt install gtk-4-examples)" >&2
fi
```

- [ ] **Step 8: Document the optional dependencies**

In `README.md`, replace the "Optional preview tooling" block Task 2 of phase 2 added with:

```markdown
### Optional preview tooling

`npm run preview:shots` and `npm run preview:factory` need `xvfb` and
ImageMagick; the GTK3 factory cross-check additionally needs
`gtk-3-examples`. `npm run preview:shots4` and the factory's GTK4 pass need
the GTK4 GObject bindings and `gtk-4-examples`. Every script skips with a
message when a tool is missing, so a fresh clone never fails on them.

    sudo apt install xvfb imagemagick gtk-3-examples gir1.2-gtk-4.0 gtk-4-examples
```

- [ ] **Step 9: Commit**

```bash
git add tools/preview/gallery4.py tools/preview/shots4.sh tools/preview/factory.sh package.json README.md
git commit -m "✨ feat: add a GTK4 widget gallery and contact sheets

A second script rather than a flag on gallery.py: gi.require_version pins
one GTK major version per interpreter, so GTK3 and GTK4 widgets cannot be
built in the same process. Optional throughout — skips cleanly when the
GTK4 bindings or the widget factory are absent."
```

---

### Task 5: GTK4 surfaces, frames, tooltips and chrome

The first coverage task, and the one that carries most of the GTK3-to-GTK4 selector differences. Every selector here was read from GTK4's own stylesheet; the reference table at the top of this plan says what each replaces and what breaks if the GTK3 form is used instead.

**Files:**

- Modify: `tools/templates/gtk4/base.mjs`, `tools/templates/gtk4/tooltip.mjs`, `tools/templates/gtk4/header-bars.mjs`
- Create: `tools/templates/gtk4/menu.mjs`
- Modify: `tools/templates/gtk4.mjs`, `tools/templates/gtk4.test.mjs`

**Interfaces:**

- Consumes: `ctx.radius`, `ctx.space`, `ctx.control.border`
- Produces: a `menu` module composed after `headerBars`

- [ ] **Step 1: Extend the selector test**

In `tools/templates/gtk4.test.mjs`, the `renderGtk4Css styles core widgets` test has an array of selectors. Replace that array with:

```js
  for (const selector of [
    "button",
    "entry",
    "headerbar",
    "scrollbar",
    "progressbar",
    "frame",
    "separator",
    ".view",
    "tooltip.background",
    "modelbutton",
    ".toolbar",
    "actionbar",
    // These two carry their trailing brace on purpose. `menubar > item` is a
    // substring of `menubar > item:selected` and `menubar > item:disabled`,
    // and `popover > contents` of the `.background` variant, so the bare
    // strings would pass with only the pseudo-class rules present — while
    // the base rule those depend on for its surface had been dropped.
    "menubar > item {",
    "popover > contents,",
  ]) {
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node --test tools/templates/gtk4.test.mjs`
Expected: FAIL — `expected CSS to style frame` (and the rest).

- [ ] **Step 3: Extend base.mjs**

Replace `tools/templates/gtk4/base.mjs` with:

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

/* The content surface. GTK4 puts a text view's editable area on a \`text\`
   child, so \`textview\` alone paints the wrong node — the GTK3 form
   (\`textview text\`) happens to still match, but the child form is what
   GTK4's own stylesheet uses and is unambiguous. */
.view,
iconview,
textview > text {
  background-color: @vl_bg_sunk;
  color: @vl_fg;
}

/* GTK4 draws a frame's border on the frame node itself. GTK3 needed
   \`frame > border\`; that child node does not exist here, so the GTK3 rule
   would match nothing and frames would draw no edge at all. */
frame,
.frame {
  border: 1px solid @vl_control_border;
  border-radius: ${ctx.radius.sm};
}

/* Decorative rules between sections. border.default rather than the control
   boundary, for the reason phase 2 established: a separator is not a
   user-interface component whose state has to be identifiable, so WCAG
   1.4.11 does not govern it. The exemption is recorded below rather than
   left implicit. */
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

- [ ] **Step 4: Fix the tooltip node**

Replace `tools/templates/gtk4/tooltip.mjs` with:

```js
export function render(ctx) {
  return `/* The fill goes on tooltip.background, not on tooltip. GTK4's own
   stylesheet puts only padding and radius on the bare node and the fill on
   the .background form, so a rule on \`tooltip\` alone loses to it on
   specificity and never lands. Both are set here so a tooltip without the
   class is still themed. */
tooltip,
tooltip.background {
  background-color: @vl_bg_overlay;
  color: @vl_fg;
  border: 1px solid @vl_control_border;
  border-radius: ${ctx.radius.md};
}

tooltip > box {
  padding: ${ctx.space["1"]};
}`;
}

export function contrastPairs(ctx) {
  return [
    {
      label: "tooltip text",
      fg: ctx.text.fg,
      bg: ctx.surface.bg_overlay,
      rule: "text",
    },
    {
      label: "tooltip boundary",
      fg: ctx.control.border,
      bg: ctx.surface.bg,
      rule: "nontext",
    },
  ];
}
```

- [ ] **Step 5: Write the menu module**

Create `tools/templates/gtk4/menu.mjs`:

```js
export function render(ctx) {
  return `/* GTK4 removed GtkMenu entirely: a menu is a popover carrying .menu and
   its entries are modelbutton nodes, so the GTK3 \`menu\`/\`menuitem\`
   selectors match nothing here. The fill goes on \`> contents\` — the
   popover node itself carries the shadow and is not the visible surface. */
popover > contents,
popover.background > contents {
  background-color: @vl_bg_overlay;
  color: @vl_fg;
  border: 1px solid @vl_control_border;
  border-radius: ${ctx.radius.md};
  padding: ${ctx.space["1"]};
}

/* The arrow is a sibling of contents, not a child, so it needs the surface
   named again or the pointer renders in GTK4's default colour. */
popover > arrow,
popover.background > arrow {
  background-color: @vl_bg_overlay;
  border: 1px solid @vl_control_border;
}

popover.menu modelbutton {
  border-radius: ${ctx.radius.sm};
  padding: ${ctx.space["1"]} ${ctx.space["2"]};
}

/* Fill plus accent_on rather than an accent mark: an accent indicator on
   bg_overlay is 2.76:1 on Midnight Red, below the 3:1 non-text floor. */
popover.menu modelbutton:hover {
  background-color: @vl_accent;
  color: @vl_accent_on;
}

popover.menu modelbutton:disabled {
  color: @vl_fg_disabled;
}

popover separator {
  background-color: @vl_border;
}

/* GTK4 names a menubar's children \`item\`, not \`menuitem\`. */
menubar {
  background-color: @vl_bg_soft;
  color: @vl_fg;
  border-bottom: 1px solid @vl_control_border;
}

menubar > item {
  padding: ${ctx.space["1"]} ${ctx.space["3"]};
  border-radius: 0;
}

menubar > item:selected,
menubar > item:hover {
  background-color: @vl_accent;
  color: @vl_accent_on;
}

menubar > item:disabled {
  color: @vl_fg_disabled;
}`;
}

export function contrastPairs(ctx) {
  return [
    {
      label: "menu entry label",
      fg: ctx.text.fg,
      bg: ctx.surface.bg_overlay,
      rule: "text",
    },
    {
      label: "menu entry hover label",
      fg: ctx.accentOn,
      bg: ctx.accent,
      rule: "text",
    },
    {
      label: "menu surface boundary",
      fg: ctx.control.border,
      bg: ctx.surface.bg,
      rule: "nontext",
    },
    {
      label: "menubar item label",
      fg: ctx.text.fg,
      bg: ctx.surface.bg_soft,
      rule: "text",
    },
    {
      label: "disabled menu entry label",
      fg: ctx.text.fg_disabled,
      bg: ctx.surface.bg_overlay,
      rule: "text",
      exempt: "WCAG 1.4.3 — text in an inactive user-interface component",
    },
  ];
}
```

- [ ] **Step 6: Extend header-bars.mjs**

Replace `tools/templates/gtk4/header-bars.mjs` with:

```js
import { composite } from "../../lib/contrast.mjs";

export function render(ctx) {
  return `headerbar {
  background-color: @vl_bg_soft;
  color: @vl_fg;
  border-bottom: 1px solid @vl_border;
}

/* GtkToolbar was removed in GTK4. What remains is the .toolbar style class
   apps put on a plain box — there is no \`toolbar\` element to match, which
   is why the GTK3 rule cannot simply be copied across. */
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

/* Chrome buttons are flat until touched: each drawing a full border would
   turn a toolbar into a grid. */
.toolbar button,
button.flat {
  background-color: transparent;
  border-color: transparent;
}

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

- [ ] **Step 7: Compose the menu module**

In `tools/templates/gtk4.mjs`, add `import * as menu from "./gtk4/menu.mjs";` next to the other widget imports, and place `menu,` in `GTK4_MODULES` directly after `headerBars`.

- [ ] **Step 8: Run the tests**

Run: `node --test tools/templates/gtk4.test.mjs tools/aa.test.mjs`
Expected: PASS, including the registry test — if you created `menu.mjs` and forgot the import, that test names the file.

- [ ] **Step 9: Regenerate, reinstall, re-capture**

```bash
npm run generate && npm run check && ./install.sh --all && npm run preview:shots4
```

`install.sh --all` refreshes `~/.themes` from the repo — the gallery renders installed themes, so a capture without it shows the previous build.

- [ ] **Step 10: Confirm the surfaces separated**

```bash
P=tools/preview/out/gtk4-vivid-life-midnight-blue.png
magick "$P" -format "%[pixel:p{200,120}]\n" info:
```

Sample inside the `.view` pane of the Surfaces section (adjust the coordinates to where it landed). Expected `srgb(10,10,10)` — `bg_sunk` — against `srgb(23,23,23)` for the `.background` pane above it. Identical values mean the ramp is still flat.

Then open the capture and confirm each section's frame now draws a hairline. A frame with no visible edge means `frame > border` slipped in from the GTK3 module.

- [ ] **Step 11: Commit**

```bash
git add tools/templates/gtk4.mjs tools/templates/gtk4/base.mjs tools/templates/gtk4/tooltip.mjs tools/templates/gtk4/header-bars.mjs tools/templates/gtk4/menu.mjs tools/templates/gtk4.test.mjs gtk-4.0/
git commit -m "🎨 feat: style GTK4 surfaces, frames, tooltips and menus

None of these could be ported from GTK3 unchanged. GTK4 draws a frame's
border on the frame node rather than a border child, puts a tooltip's fill
on tooltip.background, removed GtkMenu in favour of popover plus
modelbutton, and names menubar children item rather than menuitem. Every
selector was read from GTK4's own default stylesheet."
```

---

### Task 6: GTK4 controls

Switch, scale, spin button and level bar are the widgets GTK4 paints nothing for, exactly as in GTK3 — but every one of them addresses its parts through a different node path.

**Files:**

- Create: `tools/templates/gtk4/switch.mjs`, `tools/templates/gtk4/scale.mjs`, `tools/templates/gtk4/spinbutton.mjs`
- Modify: `tools/templates/gtk4/entry.mjs`, `tools/templates/gtk4/check-radio.mjs`, `tools/templates/gtk4/progress.mjs`, `tools/templates/gtk4/button.mjs`
- Modify: `tools/templates/gtk4.mjs`, `tools/templates/gtk4.test.mjs`

**Interfaces:**

- Consumes: `ctx.radius`, `ctx.space`, `ctx.control.border`
- Produces: `switchWidget`, `scale` and `spinbutton` module namespace objects in `GTK4_MODULES`, composed after `entry`

- [ ] **Step 1: Extend the selector test**

Add to the selector array in `renderGtk4Css styles core widgets`:

```js
    "switch > slider",
    "scale > trough > slider",
    "spinbutton > text",
    "levelbar",
    "spinner",
    "dropdown",
    ".linked",
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node --test tools/templates/gtk4.test.mjs`
Expected: FAIL — `expected CSS to style switch > slider`.

- [ ] **Step 3: Write the switch module**

Create `tools/templates/gtk4/switch.mjs`:

```js
export function render(ctx) {
  return `switch {
  background-color: @vl_bg_sunk;
  border: 1px solid @vl_control_border;
  border-radius: ${ctx.radius.pill};
  min-width: 40px;
  min-height: 20px;
}

switch:checked {
  background-color: @vl_accent;
  border-color: @vl_accent;
}

/* The child combinator is what GTK4's own stylesheet uses. The GTK3
   descendant form still matches, but \`switch > slider\` says exactly which
   node is meant and cannot pick up a nested one. */
switch > slider {
  background-color: @vl_fg_muted;
  border-radius: 50%;
  min-width: 16px;
  min-height: 16px;
  margin: 1px;
}

switch:checked > slider {
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

- [ ] **Step 4: Write the scale module**

Create `tools/templates/gtk4/scale.mjs`:

```js
export function render(ctx) {
  return `/* GTK4 nests the slider inside the trough — \`scale > trough > slider\`,
   not \`scale > slider\`. A rule on the latter matches nothing and the knob
   stays unpainted while the trough looks correct, which reads as a scale
   that simply has no handle. */
scale > trough {
  background-color: @vl_bg_sunk;
  border: 1px solid @vl_control_border;
  border-radius: ${ctx.radius.pill};
  min-height: ${ctx.space["1"]};
  min-width: ${ctx.space["1"]};
}

scale > trough > highlight {
  background-color: @vl_accent;
  border-radius: ${ctx.radius.pill};
}

/* The knob is the control boundary colour rather than the accent: it
   overlaps the accent highlight for most of the scale's travel, and accent
   on accent has no edge at all. */
scale > trough > slider {
  background-color: @vl_control_border;
  border-radius: ${ctx.radius.pill};
  min-width: ${ctx.space["4"]};
  min-height: ${ctx.space["4"]};
  margin: -${ctx.space["2"]};
}

scale > trough > slider:hover {
  background-color: @vl_accent;
}

scale:disabled > trough > slider {
  background-color: @vl_fg_disabled;
}

scale > marks label {
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

- [ ] **Step 5: Write the spinbutton module**

Create `tools/templates/gtk4/spinbutton.mjs`:

```js
export function render(ctx) {
  return `/* GTK4 draws a spin button as a text node with two button siblings.
   Styling the outer node and neutralising the children keeps it reading as
   one field rather than a text box wedged between two buttons. */
spinbutton {
  background-color: @vl_bg_sunk;
  color: @vl_fg;
  border: 1px solid @vl_control_border;
  border-radius: ${ctx.radius.sm};
}

spinbutton > text {
  background-color: transparent;
  color: @vl_fg;
  padding: ${ctx.space["1"]} ${ctx.space["2"]};
}

spinbutton > button {
  background-color: transparent;
  border: none;
  border-radius: 0;
  color: @vl_fg_muted;
  padding: 0 ${ctx.space["2"]};
}

spinbutton > button:hover {
  background-color: alpha(@vl_accent, 0.2);
  color: @vl_fg;
}

spinbutton > button:disabled {
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

- [ ] **Step 6: Extend entry.mjs with the text child and the dropdown**

Replace `tools/templates/gtk4/entry.mjs` with:

```js
export function render(ctx) {
  return `entry {
  background-color: @vl_bg_sunk;
  color: @vl_fg;
  border: 1px solid @vl_control_border;
  border-radius: ${ctx.radius.sm};
  padding: ${ctx.space["1"]} ${ctx.space["2"]};
}

/* GTK4 puts the editable text, caret and placeholder on a \`text\` child.
   Without a rule here the field's own background paints over them on some
   themes and the placeholder keeps GTK4's default opacity. */
entry > text {
  background-color: transparent;
  color: @vl_fg;
}

entry > text > placeholder {
  color: @vl_fg_muted;
}

/* GTK4 focuses the child, so the state lands on the parent as
   :focus-within. \`entry:focus\` never matches and the ring never appears. */
entry:focus-within {
  border-color: @vl_accent;
}

entry:disabled {
  color: @vl_fg_disabled;
}

/* GtkComboBox is deprecated in GTK4 and GtkDropDown is the replacement, so
   both nodes are styled — an app using either is covered. */
dropdown > button,
combobox > button {
  border-radius: ${ctx.radius.sm};
}

dropdown arrow,
combobox arrow {
  color: @vl_fg_muted;
  min-width: ${ctx.space["4"]};
  min-height: ${ctx.space["4"]};
}`;
}

export function contrastPairs(ctx) {
  return [
    {
      label: "entry text",
      fg: ctx.text.fg,
      bg: ctx.surface.bg_sunk,
      rule: "text",
    },
    {
      label: "entry placeholder",
      fg: ctx.text.fg_muted,
      bg: ctx.surface.bg_sunk,
      rule: "text",
    },
    {
      label: "entry boundary",
      fg: ctx.control.border,
      bg: ctx.surface.bg,
      rule: "nontext",
    },
    {
      label: "dropdown arrow",
      fg: ctx.text.fg_muted,
      bg: ctx.surface.bg_soft,
      rule: "nontext",
    },
  ];
}
```

- [ ] **Step 7: Extend check-radio.mjs**

Replace `tools/templates/gtk4/check-radio.mjs` with:

```js
export function render(ctx) {
  return `/* GTK4 wraps both in a checkbutton; the indicator keeps the GTK3 node
   names, so both the wrapped and bare forms are addressed. */
checkbutton > check,
checkbutton > radio,
check,
radio {
  background-color: @vl_bg_sunk;
  border: 1px solid @vl_control_border;
  min-width: 14px;
  min-height: 14px;
}

check {
  border-radius: ${ctx.radius.sm};
}

radio {
  border-radius: 50%;
}

checkbutton > check:checked,
checkbutton > radio:checked,
check:checked,
radio:checked {
  background-color: @vl_accent;
  border-color: @vl_accent;
  color: @vl_accent_on;
}

/* A theme replaces GTK4's default stylesheet, which is what supplies the
   tick and the dot, so without a rule here a checked indicator fills with
   accent and shows no mark — the same defect phase 2 hit with expander
   arrows. But the two cases cannot be solved the same way, and this is the
   one place in the port where that matters:
   
   GTK4's default sources both glyphs from theme-relative assets
   (url("assets/check-symbolic.symbolic.png") and bullet-symbolic). Those
   live under theme/Default/assets/ in GTK's gresource, NOT under icons/,
   so they are private to that theme and -gtk-icontheme() cannot reach
   them. Our theme ships no assets and must not start (see the repo's "do
   not bundle icons" rule), so a url() reference is not available either.
   
   The tick has a standard icon-theme equivalent: object-select-symbolic is
   in GTK's own icons/scalable/actions, so naming it adds no dependency.
   The dot has none — there is no bullet or circle glyph in the icon theme
   at all — so the radio draws its dot in CSS instead: an accent fill with
   an inset ring of the surface colour, leaving an accent core. */
checkbutton > check:checked,
check:checked {
  -gtk-icon-source: -gtk-icontheme("object-select-symbolic");
}

checkbutton > radio:checked,
radio:checked {
  -gtk-icon-source: none;
  box-shadow: inset 0 0 0 3px @vl_bg_sunk;
}

checkbutton:disabled,
check:disabled,
radio:disabled {
  color: @vl_fg_disabled;
}`;
}

export function contrastPairs(ctx) {
  return [
    {
      label: "checked indicator glyph",
      fg: ctx.accentOn,
      bg: ctx.accent,
      rule: "nontext",
    },
    {
      // The radio's dot is drawn, not sourced: accent showing through an
      // inset ring of bg_sunk. That makes accent-on-bg_sunk the pair that
      // decides whether the dot is visible — 3.49:1 at worst, noon orange.
      label: "radio dot",
      fg: ctx.accent,
      bg: ctx.surface.bg_sunk,
      rule: "nontext",
    },
    {
      label: "indicator boundary",
      fg: ctx.control.border,
      bg: ctx.surface.bg,
      rule: "nontext",
    },
  ];
}
```

- [ ] **Step 8: Add the level bar and spinner**

Replace `tools/templates/gtk4/progress.mjs` with:

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

/* GTK4 nests block inside trough. GTK gives neither any default paint, so
   with no rule a level bar is an empty box the height of a line. */
levelbar > trough {
  background-color: @vl_bg_sunk;
  border: 1px solid @vl_control_border;
  border-radius: ${ctx.radius.sm};
  min-height: ${ctx.space["2"]};
}

/* The filled state is \`block:not(.empty)\`, NOT \`block.filled\` — there is no
   .filled class in GTK4, nor in GTK3. Verified against GTK4's own
   stylesheet, which uses \`block:not(.empty)\` for exactly this. (The GTK3
   module in this repo carries the .filled mistake; recorded as a finding
   for the next plan, out of scope here.)

   This rule comes BEFORE .low/.high/.full deliberately: those are the same
   specificity (0,1,1), so source order decides, and a block that is both
   filled and high should read as high. */
levelbar > trough > block:not(.empty) {
  background-color: @vl_accent;
  border-radius: ${ctx.radius.sm};
}

/* GTK's built-in offsets: below "low" and at/above "high". Semantic rather
   than accent, because a level crossing a threshold is the one piece of
   information a level bar carries. */
levelbar > trough > block.low {
  background-color: @vl_warning;
}

levelbar > trough > block.high,
levelbar > trough > block.full {
  background-color: @vl_success;
}

levelbar > trough > block.empty {
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

- [ ] **Step 9: Give buttons the control boundary and linked geometry**

Replace `tools/templates/gtk4/button.mjs` with:

```js
export function render(ctx) {
  return `button {
  background-color: @vl_bg_soft;
  color: @vl_fg;
  /* border.default is identical to bg_soft on Midnight (1.00:1), so the
     derived control boundary is what gives a button an edge at all. */
  border: 1px solid @vl_control_border;
  border-radius: ${ctx.radius.sm};
  padding: ${ctx.space["1"]} ${ctx.space["3"]};
  margin: ${ctx.space.px};
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

button.suggested-action {
  background-color: @vl_accent;
  color: @vl_accent_on;
  border-color: @vl_accent;
}

button.destructive-action {
  background-color: @vl_danger;
  color: @vl_accent_on;
  border-color: @vl_danger;
}

/* A linked group is one control drawn as several: square the interior
   corners and collapse the shared edges so three buttons read as a
   segmented control rather than three adjacent controls. */
.linked > button {
  border-radius: 0;
  margin: 0;
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
}`;
}

export function contrastPairs(ctx) {
  return [
    {
      label: "button label",
      fg: ctx.text.fg,
      bg: ctx.surface.bg_soft,
      rule: "text",
    },
    {
      label: "button boundary",
      fg: ctx.control.border,
      bg: ctx.surface.bg,
      rule: "nontext",
    },
    {
      label: "button hover label",
      fg: ctx.text.fg,
      bg: ctx.border.default,
      rule: "text",
    },
    {
      label: "active button label",
      fg: ctx.accentOn,
      bg: ctx.accent,
      rule: "text",
    },
    {
      label: "suggested button label",
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

- [ ] **Step 10: Compose the three new modules**

In `tools/templates/gtk4.mjs`, add the imports next to the other widget imports:

```js
import * as spinbutton from "./gtk4/spinbutton.mjs";
import * as scale from "./gtk4/scale.mjs";
import * as switchWidget from "./gtk4/switch.mjs";
```

and place them in `GTK4_MODULES` directly after `entry`:

```js
  entry,
  spinbutton,
  scale,
  switchWidget,
```

`switch` is a reserved word — the namespace binding must be `switchWidget`, as it is in `gtk3.mjs`.

- [ ] **Step 11: Run the tests**

Run: `node --test tools/templates/gtk4.test.mjs tools/aa.test.mjs`
Expected: PASS.

The gate is doing real work here for the first time on GTK4: `button boundary` and every `*ledboundary*` pair asserts `control.border`, whose tightest case is 3.10:1 on Twilight Red. A failure naming a specific flavor means a surface was paired with a token the verified table already rules out.

- [ ] **Step 12: Regenerate, reinstall, re-capture**

```bash
npm run generate && npm run check && ./install.sh --all && npm run preview:shots4
```

- [ ] **Step 13: Confirm the controls are drawn**

Open `tools/preview/out/gtk4-vivid-life-midnight-blue.png` and check each:

- Both switches show a rounded trough with a visible knob, the checked one accent-filled. A bare tick and circle means the `switch > slider` rule did not land.
- Both scales show a trough with an accent-filled left portion and a round knob. A trough with no knob means `scale > trough > slider` is wrong.
- The three level bars are filled blocks on a bordered trough, not empty rows.
- The checkbox shows an actual tick, not a blank accent square. A blank fill means `object-select-symbolic` did not resolve — confirm it is present in the icon theme with the `gresource list` command in this plan's reference section before reaching for a different name.
- The radio shows an accent dot inside a ring, not a solid accent disc and not a blank one. A solid disc means the inset `box-shadow` was dropped; a blank one means `-gtk-icon-source: none` is missing and GTK is still trying to draw an asset it cannot find.
- The linked group reads as one segmented control with no doubled interior borders.

- [ ] **Step 14: Commit**

```bash
git add tools/templates/gtk4.mjs tools/templates/gtk4/ tools/templates/gtk4.test.mjs gtk-4.0/
git commit -m "🎨 feat: style GTK4 switches, scales, spin buttons and level bars

GTK4 paints none of these by default, and each addresses its parts through
a different node path than GTK3: the slider nests inside the trough, the
spin button's field is a text child, and an entry focuses as
:focus-within.

A theme replaces the stylesheet that supplies indicator glyphs, and the
two indicators need different answers. GTK4 keeps its tick and dot as
theme-private assets rather than icon-theme icons, so neither can be named
with -gtk-icontheme. The checkbox borrows object-select-symbolic, which is
a real icon-theme icon; the radio has no such equivalent and draws its dot
with an inset ring instead. Neither bundles an asset."
```

---

### Task 7: GTK4 views, lists, layout and selection

The last GTK4 coverage task. Two of phase 2's four hard-won lessons apply directly here and are the reason this is one task rather than three.

**`:selected` has zero specificity.** It uses no element or class selector of its own, so any new surface rule outranks it. `columnview.view` and `.sidebar row` are both (0,1,1) and will silently unhighlight every selected row unless selection is restated at its own specificity. This is why `selection.mjs` is composed **last** and why its rules name the widgets they target rather than relying on source order alone.

**`background-image` composites over `background-color`.** GTK4's default sets `paned > separator { background-image: image(#1b1b1b); }`. A colour-only rule renders that image, not the colour asked for. `background-image: none` is required.

**Files:**

- Create: `tools/templates/gtk4/view.mjs`, `paned.mjs`, `sidebar.mjs`, `notebook.mjs`, `misc.mjs`, `selection.mjs`
- Modify: `tools/templates/gtk4.mjs`, `tools/templates/gtk4.test.mjs`

**Interfaces:**

- Consumes: `ctx.radius`, `ctx.space`, `ctx.control.border`; `composite` from `tools/lib/contrast.mjs`
- Produces: six module namespace objects in `GTK4_MODULES`; `selection` is composed last

- [ ] **Step 1: Extend the selector test**

Add to the selector array:

```js
    "columnview",
    "listview",
    "treeexpander",
    "paned > separator",
    ".sidebar",
    ".navigation-sidebar",
    "notebook > header",
    "calendar",
    "expander-widget",
    ":selected",
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node --test tools/templates/gtk4.test.mjs`
Expected: FAIL — `expected CSS to style columnview`.

- [ ] **Step 3: Write the view module**

Create `tools/templates/gtk4/view.mjs`:

```js
import { composite } from "../../lib/contrast.mjs";

export function render(ctx) {
  return `/* columnview and listview are GTK4's modern list widgets; treeview is
   deprecated but still present in 4.14 and still rendered by ported apps. */
columnview.view,
treeview.view,
listview,
iconview {
  background-color: @vl_bg_sunk;
  color: @vl_fg;
  border-radius: ${ctx.radius.sm};
}

/* Column headers are button nodes, so without a rule they inherit the full
   raised-button chrome where a flat header belongs. */
columnview.view header button,
treeview.view header button {
  background-color: @vl_bg_soft;
  color: @vl_fg_muted;
  border: none;
  border-bottom: 1px solid @vl_control_border;
  border-radius: 0;
  margin: 0;
  padding: ${ctx.space["1"]} ${ctx.space["2"]};
}

/* Promoted to fg, not left muted: fg_muted over the hover composite is
   3.70:1, below the 4.5:1 text floor. */
columnview.view header button:hover,
treeview.view header button:hover {
  background-color: alpha(@vl_accent, 0.2);
  color: @vl_fg;
}

/* A theme replaces GTK4's default stylesheet, and that default is what
   supplies -gtk-icon-source for arrow nodes. Without naming the icon these
   render as an empty indent, and setting color alone cannot fix it —
   there is no glyph to tint. GTK ships pan-* in its own gresource. */
columnview.view.expander,
treeview.view.expander,
treeexpander > expander {
  -gtk-icon-source: -gtk-icontheme("pan-end-symbolic");
  color: @vl_fg_muted;
  min-width: 16px;
  min-height: 16px;
}

columnview.view.expander:checked,
treeview.view.expander:checked,
treeexpander > expander:checked {
  -gtk-icon-source: -gtk-icontheme("pan-down-symbolic");
}

/* Rows stay transparent so the view's surface shows through and the
   selection fill is the only thing that paints a row. */
list,
list > row,
listview > row {
  background-color: transparent;
}

list > row,
listview > row {
  padding: ${ctx.space["1"]} ${ctx.space["2"]};
}

list > row:hover,
listview > row:hover {
  background-color: alpha(@vl_accent, 0.2);
  color: @vl_fg;
}`;
}

export function contrastPairs(ctx) {
  return [
    {
      label: "list view text",
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
      bg: composite(ctx.surface.bg_sunk, `${ctx.accent}33`),
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

- [ ] **Step 4: Write the paned, sidebar and notebook modules**

Create `tools/templates/gtk4/paned.mjs`:

```js
export function render(ctx) {
  return `/* The control boundary, not border.default: a paned handle is draggable
   and its position is meaningful, which makes it a user-interface component
   under WCAG 1.4.11 rather than the decorative rule base.mjs styles.
   background-image: none is required, not optional — GTK4's default sets a
   handle image on this node, and an image composites over a colour, so a
   colour-only rule renders GTK4's grey instead of the token asked for. */
paned > separator {
  background-image: none;
  background-color: @vl_control_border;
  min-width: ${ctx.space.px};
  min-height: ${ctx.space.px};
}

paned > separator:hover {
  background-image: none;
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

Create `tools/templates/gtk4/sidebar.mjs`:

```js
export function render(ctx) {
  return `/* \`.navigation-sidebar\` is GTK4-only — 22 rules in GTK4's own sheet, zero
   in GTK3 — and it is the class modern GTK4/libadwaita apps actually put on
   sidebar rows. Without it the most visible widget in a modern GTK4 app falls
   back to unstyled rows. Upstream writes \`> row\`; the descendant forms below
   are a superset, so they match that and any wrapped variant. */
.sidebar,
.navigation-sidebar,
placessidebar,
stacksidebar {
  background-color: @vl_bg_soft;
  color: @vl_fg;
  border-right: 1px solid @vl_control_border;
}

/* Phase 2's lesson, and it holds in GTK4: some container nodes render no
   background of their own. A sidebar nests a scrolledwindow and a viewport,
   and only the inner nodes paint, so the surface goes on those and the
   scrolledwindow is cleared. */
.sidebar scrolledwindow,
.navigation-sidebar scrolledwindow,
placessidebar scrolledwindow,
stacksidebar scrolledwindow {
  background-color: transparent;
}

.sidebar viewport,
.sidebar list,
.navigation-sidebar viewport,
.navigation-sidebar list,
placessidebar viewport,
placessidebar list,
stacksidebar viewport,
stacksidebar list {
  background-color: @vl_bg_soft;
}

/* Rows stay transparent so the sidebar's own surface shows through and
   selection is the only thing that fills a row. An accent stripe on the row
   instead would be 2.76:1 against bg_soft on Midnight Red. */
.sidebar row,
.navigation-sidebar row,
placessidebar row,
stacksidebar row {
  background-color: transparent;
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

Create `tools/templates/gtk4/notebook.mjs`:

```js
export function render(ctx) {
  return `notebook > header {
  background-color: @vl_bg_soft;
  border-color: @vl_control_border;
}

notebook > header > tabs > tab {
  color: @vl_fg_muted;
  padding: ${ctx.space["1"]} ${ctx.space["3"]};
  border-radius: 0;
}

/* This is the one accent mark in the port that sits on a chrome band, and
   it does not contradict the "no accent mark on bg_soft or bg_overlay"
   constraint — it is legal precisely BECAUSE the same rule repaints the
   checked tab to bg_sunk. The underline is drawn against that sunk
   surface, not against the bg_soft the header carries, and accent on
   bg_sunk clears 3:1 (3.49:1 at worst, noon orange).

   Do not "fix" this back to a plain fill without also removing the
   background-color line: drop the repaint and the underline lands on
   bg_soft at 2.76:1 on Midnight Red, and the constraint is then real. */
notebook > header > tabs > tab:checked {
  background-color: @vl_bg_sunk;
  color: @vl_fg;
  box-shadow: inset 0 -3px @vl_accent;
}

notebook > header > tabs > tab:hover:not(:checked) {
  color: @vl_fg;
}

notebook > stack {
  background-color: @vl_bg_sunk;
}`;
}

export function contrastPairs(ctx) {
  return [
    {
      label: "inactive tab label",
      fg: ctx.text.fg_muted,
      bg: ctx.surface.bg_soft,
      rule: "text",
    },
    {
      label: "active tab label",
      fg: ctx.text.fg,
      bg: ctx.surface.bg_sunk,
      rule: "text",
    },
    {
      label: "active tab underline",
      fg: ctx.accent,
      bg: ctx.surface.bg_sunk,
      rule: "nontext",
    },
  ];
}
```

- [ ] **Step 5: Write the misc module**

Create `tools/templates/gtk4/misc.mjs`:

```js
export function render(ctx) {
  return `calendar {
  background-color: @vl_bg_sunk;
  color: @vl_fg;
  border: 1px solid @vl_control_border;
  border-radius: ${ctx.radius.sm};
}

calendar > header {
  border-bottom: 1px solid @vl_control_border;
}

calendar > grid > label {
  padding: ${ctx.space["1"]};
}

calendar > grid > label.other-month,
calendar > grid > label.day-name {
  color: @vl_fg_muted;
}

calendar > grid > label:selected {
  background-color: @vl_accent;
  color: @vl_accent_on;
  border-radius: ${ctx.radius.sm};
}

/* GTK4 renamed the widget node to expander-widget and gave the arrow the
   name \`expander\` — exactly inverted from GTK3, where the widget is
   \`expander\` and the arrow is \`arrow\`. Using the GTK3 form here tints the
   arrow and loses the widget rule entirely. */
expander-widget title {
  color: @vl_fg;
  padding: ${ctx.space["1"]} 0;
}

expander-widget expander {
  -gtk-icon-source: -gtk-icontheme("pan-end-symbolic");
  color: @vl_fg_muted;
  min-width: 16px;
  min-height: 16px;
}

expander-widget expander:checked {
  -gtk-icon-source: -gtk-icontheme("pan-down-symbolic");
}

expander-widget title:hover expander {
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

- [ ] **Step 6: Write the selection module**

Create `tools/templates/gtk4/selection.mjs`:

```js
export function render(ctx) {
  return `/* Composed last, and every widget it must beat is named explicitly.
   \`:selected\` alone uses no element or class selector, so it contributes
   zero specificity and loses to any rule that paints a background on a node
   that can be selected — columnview.view and .sidebar row are both (0,1,1)
   and would silently unhighlight every selected row. Source order does not
   rescue it; matching their specificity does. */
:selected,
selection {
  background-color: @vl_accent;
  color: @vl_accent_on;
}

columnview.view:selected,
treeview.view:selected,
listview > row:selected,
list > row:selected,
.sidebar row:selected,
.navigation-sidebar row:selected,
placessidebar row:selected,
stacksidebar row:selected,
iconview:selected {
  background-color: @vl_accent;
  color: @vl_accent_on;
}

/* Deliberately narrow. The broad form — every label under a selected row —
   also flattens .warning/.error/.success text inside that row, which is the
   defect the GTK3 port carried until phase 2. Only the dimmed secondary
   labels need promoting, because they are the ones that would otherwise
   stay muted against an accent fill. */
:selected .dim-label,
:selected .subtitle {
  color: @vl_accent_on;
}`;
}

export function contrastPairs(ctx) {
  return [
    {
      label: "selected row label",
      fg: ctx.accentOn,
      bg: ctx.accent,
      rule: "text",
    },
    {
      label: "selected row subtitle",
      fg: ctx.accentOn,
      bg: ctx.accent,
      rule: "text",
    },
  ];
}
```

- [ ] **Step 7: Compose the six modules**

In `tools/templates/gtk4.mjs`, add the imports and extend `GTK4_MODULES` so it reads:

```js
export const GTK4_MODULES = [
  tokens,
  base,
  button,
  entry,
  spinbutton,
  scale,
  switchWidget,
  checkRadio,
  notebook,
  view,
  paned,
  sidebar,
  menu,
  headerBars,
  scrollbar,
  progress,
  tooltip,
  misc,
  selection,
];
```

`selection` last is part of the contract, mirroring `gtk3.mjs`. Add the matching `import * as ... from "./gtk4/<file>.mjs";` line for `notebook`, `view`, `paned`, `sidebar`, `misc` and `selection`.

- [ ] **Step 8: Run the tests**

Run: `node --test tools/templates/gtk4.test.mjs tools/aa.test.mjs`
Expected: PASS.

- [ ] **Step 9: Regenerate, reinstall, re-capture**

```bash
npm run generate && npm run check && ./install.sh --all && npm run preview:shots4
```

- [ ] **Step 10: Confirm selection survived the new surface rules**

This is the check phase 2 learned to make explicitly, because the failure looks like nothing rather than like a defect:

```bash
P=tools/preview/out/gtk4-vivid-life-midnight-blue.png
magick "$P" -format "%[pixel:p{120,860}]\n" info:
```

Sample a pixel inside the selected list row (adjust the coordinates to where the Lists section landed). Expected the flavor's accent — `srgb(96,165,250)` for Midnight Blue — not `srgb(10,10,10)`. The sunk surface there means `listview` outranked the selection rule and the explicit restatement in `selection.mjs` is missing a selector.

Also confirm on the sheet: the paned handle is a visible hairline rather than GTK4's default grey (that one proves `background-image: none` landed), the sidebar pane is `bg_soft` rather than the window colour, and the expander arrow is a triangle rather than an empty indent.

- [ ] **Step 11: Review all four GTK4 contact sheets**

Open `contact-gtk4-midnight.png`, `contact-gtk4-twilight.png`, `contact-gtk4-dawn.png` and `contact-gtk4-noon.png`. Twilight and Dawn are the ones to look hardest at, for the reason phase 2 gave: Twilight has the narrowest surface ramp (`bg` `#404040` against `bg_soft` `#525252`), and Dawn is the light flavor where a boundary derived for dark flavors is most likely to read as heavy.

- [ ] **Step 12: Commit**

```bash
git add tools/templates/gtk4.mjs tools/templates/gtk4/ tools/templates/gtk4.test.mjs gtk-4.0/
git commit -m "🎨 feat: style GTK4 views, lists, layout and selection

Selection is restated at each selectable widget's own specificity rather
than left to :selected, which contributes zero and loses to every surface
rule this task adds. The paned handle sets background-image: none because
GTK4 ships a handle image that composites over the colour. Expander and
tree arrows name their icon source, since a theme replaces the stylesheet
that would otherwise supply it."
```

---

### Task 8: GTK2 coverage sweep

GTK2 has no CSS nodes and no cascade. Coverage is a matter of which widget classes carry a style and how it is bound, and the binding vocabulary at the top of this plan is the checklist.

**Scope discipline.** This port uses **no GTK2 engine** — `bg`/`fg`/`base`/`text` state arrays only. `libmurrine` and `libpixmap` are installed on this machine, but requiring either would make the theme fail on systems that lack them, and neither is needed for a colour port. Do not add an `engine "..."` block.

**Why the colour scheme matters most.** GTK2's default drawing code and many applications read `gtk-color-scheme` keys directly. Setting the seven keys we currently omit is the single highest-coverage change available here, and it costs no bindings at all.

**Files:**

- Modify: `tools/templates/gtk2/_tokens.mjs`, `tools/templates/gtk2/base.mjs`
- Create: `tools/templates/gtk2/menu.mjs`, `tools/templates/gtk2/view.mjs`, `tools/templates/gtk2/chrome.mjs`, `tools/templates/gtk2/tooltip.mjs`
- Modify: `tools/templates/gtk2.mjs`, `tools/templates/gtk2.test.mjs`

**Interfaces:**

- Consumes: `ctx.control.border`, `ctx.semantic`
- Produces: four module namespace objects in `GTK2_MODULES`, composed after `entry`

- [ ] **Step 1: Extend the test with the binding vocabulary**

Add to `tools/templates/gtk2.test.mjs`:

```js
test("renderGtk2Gtkrc binds the widget classes Xfce renders", () => {
  const gtkrc = renderGtk2Gtkrc(
    flavorBlock("midnight"),
    resolveAccent("midnight", "blue"),
    accentOn("midnight"),
  );
  for (const binding of [
    'class "GtkWidget"',
    'class "GtkButton"',
    'class "GtkEntry"',
    'class "GtkMenu"',
    'class "GtkMenuBar"',
    'class "GtkNotebook"',
    'class "GtkProgressBar"',
    'class "GtkTextView"',
    'class "GtkScrolledWindow"',
    'class "GtkFrame"',
    'widget_class "*<GtkMenuItem>*"',
    'widget_class "*<GtkTreeView>*<GtkButton>*"',
    'widget_class "*<GtkToolbar>*<GtkButton>"',
    'widget "gtk-tooltip*"',
  ]) {
    assert.ok(gtkrc.includes(binding), `expected gtkrc to bind ${binding}`);
  }
});

// GTK2's default drawing code and many applications read these keys
// directly, so they are the highest-coverage part of a GTK2 colour theme.
test("renderGtk2Gtkrc sets the full colour scheme", () => {
  const gtkrc = renderGtk2Gtkrc(
    flavorBlock("midnight"),
    resolveAccent("midnight", "blue"),
    accentOn("midnight"),
  );
  for (const key of [
    "bg_color",
    "fg_color",
    "base_color",
    "text_color",
    "selected_bg_color",
    "selected_fg_color",
    "insensitive_bg_color",
    "insensitive_fg_color",
    "menu_color",
    "tooltip_bg_color",
    "tooltip_fg_color",
    "link_color",
  ]) {
    assert.ok(gtkrc.includes(`${key}:`), `expected colour scheme key ${key}`);
  }
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node --test tools/templates/gtk2.test.mjs`
Expected: FAIL — `expected gtkrc to bind class "GtkMenu"`.

- [ ] **Step 3: Complete the colour scheme**

Replace `tools/templates/gtk2/_tokens.mjs` with:

```js
// GTK2 reads these keys directly, in the default drawing code and in
// applications that resolve @named colours. Setting all of them is the
// cheapest coverage this target has: every one reaches widgets no style
// block of ours is bound to.
//
// The value is one gtkrc string with escaped newlines, which is why the
// pairs are assembled rather than written out — a literal here would be a
// single 400-character line nobody can diff.
const schemeKeys = (ctx) => [
  ["bg_color", ctx.surface.bg],
  ["fg_color", ctx.text.fg],
  ["base_color", ctx.surface.bg_sunk],
  ["text_color", ctx.text.fg],
  ["selected_bg_color", ctx.accent],
  ["selected_fg_color", ctx.accentOn],
  ["insensitive_bg_color", ctx.surface.bg_soft],
  ["insensitive_fg_color", ctx.text.fg_disabled],
  ["menu_color", ctx.surface.bg_overlay],
  ["tooltip_bg_color", ctx.surface.bg_overlay],
  ["tooltip_fg_color", ctx.text.fg],
  ["link_color", ctx.accent],
  ["visited_link_color", ctx.text.fg_muted],
];

export function render(ctx) {
  const scheme = schemeKeys(ctx)
    .map(([key, value]) => `${key}:${value}`)
    .join("\\n");
  return `gtk-color-scheme = "${scheme}"`;
}

export function contrastPairs(ctx) {
  return [
    { label: "link text", fg: ctx.accent, bg: ctx.surface.bg, rule: "text" },
    {
      label: "visited link text",
      fg: ctx.text.fg_muted,
      bg: ctx.surface.bg,
      rule: "text",
    },
  ];
}
```

The `\\n` in the template literal produces a literal backslash-n in the gtkrc, which is what GTK2 expects — not a real newline.

- [ ] **Step 4: Widen the default style and bind frames**

In `tools/templates/gtk2/base.mjs`, extend the `render` return. Keep every existing `bg`/`fg` line unchanged, and replace everything from the `base[NORMAL]` line to the end of the template literal with:

```
  base[NORMAL]      = "${ctx.surface.bg_sunk}"
  base[SELECTED]    = "${ctx.accent}"
  base[ACTIVE]      = "${ctx.accent}"
  base[INSENSITIVE] = "${ctx.surface.bg_soft}"

  text[NORMAL]      = "${ctx.text.fg}"
  text[SELECTED]    = "${ctx.accentOn}"
  text[ACTIVE]      = "${ctx.accentOn}"
  text[INSENSITIVE] = "${ctx.text.fg_disabled}"

  xthickness = 1
  ythickness = 1
}

class "GtkWidget" style "vivid-life-default"

# A frame's edge is drawn with the shadow colours GTK2 derives from
# bg[NORMAL], which on our surfaces is too close to the canvas to read.
# Naming bg[NORMAL] as the control boundary is the only lever a
# non-engine gtkrc has for a frame outline.
style "vivid-life-frame" {
  bg[NORMAL] = "${ctx.control.border}"
}

class "GtkFrame" style "vivid-life-frame"

style "vivid-life-scrolled" {
  bg[NORMAL] = "${ctx.surface.bg_sunk}"
}

class "GtkScrolledWindow" style "vivid-life-scrolled"
```

Comments in gtkrc are `#`, not `/* */`. Add two pairs to the module's `contrastPairs` return array:

```js
    {
      label: "frame boundary",
      fg: ctx.control.border,
      bg: ctx.surface.bg,
      rule: "nontext",
    },
    {
      label: "insensitive label",
      fg: ctx.text.fg_disabled,
      bg: ctx.surface.bg_soft,
      rule: "text",
      exempt: "WCAG 1.4.3 — text in an inactive user-interface component",
    },
```

- [ ] **Step 5: Write the menu module**

Create `tools/templates/gtk2/menu.mjs`:

```js
export function render(ctx) {
  return `style "vivid-life-menu" {
  bg[NORMAL]   = "${ctx.surface.bg_overlay}"
  fg[NORMAL]   = "${ctx.text.fg}"
  text[NORMAL] = "${ctx.text.fg}"
}

class "GtkMenu" style "vivid-life-menu"

style "vivid-life-menubar" {
  bg[NORMAL] = "${ctx.surface.bg_soft}"
  fg[NORMAL] = "${ctx.text.fg}"
}

class "GtkMenuBar" style "vivid-life-menubar"

# GTK2 draws a menu entry's prelight as bg[PRELIGHT] with fg[PRELIGHT] on
# top. Fill plus accent_on rather than an accent mark, for the same reason
# as GTK3 and GTK4: an accent indicator on bg_overlay is 2.76:1 on Midnight
# Red, below the 3:1 non-text floor.
style "vivid-life-menuitem" {
  bg[PRELIGHT]    = "${ctx.accent}"
  fg[PRELIGHT]    = "${ctx.accentOn}"
  fg[NORMAL]      = "${ctx.text.fg}"
  fg[INSENSITIVE] = "${ctx.text.fg_disabled}"
}

widget_class "*<GtkMenuItem>*" style "vivid-life-menuitem"

# Menubar entries sit on bg_soft rather than on the menu surface. The more
# specific widget_class path wins between two widget_class matches, so this
# narrows the rule above rather than racing it.
widget_class "*<GtkMenuBar>.<GtkMenuItem>*" style "vivid-life-menuitem"

style "vivid-life-menu-separator" {
  bg[NORMAL] = "${ctx.border.default}"
}

widget_class "*<GtkSeparatorMenuItem>*" style "vivid-life-menu-separator"`;
}

export function contrastPairs(ctx) {
  return [
    {
      label: "menu entry label",
      fg: ctx.text.fg,
      bg: ctx.surface.bg_overlay,
      rule: "text",
    },
    {
      label: "menu entry prelight label",
      fg: ctx.accentOn,
      bg: ctx.accent,
      rule: "text",
    },
    {
      label: "menubar item label",
      fg: ctx.text.fg,
      bg: ctx.surface.bg_soft,
      rule: "text",
    },
    {
      label: "menu separator",
      fg: ctx.border.default,
      bg: ctx.surface.bg_overlay,
      rule: "nontext",
      exempt:
        "WCAG 1.4.11 — decorative separator, not a UI component whose state must be identifiable",
    },
  ];
}
```

- [ ] **Step 6: Write the view module**

Create `tools/templates/gtk2/view.mjs`:

```js
export function render(ctx) {
  return `style "vivid-life-view" {
  base[NORMAL]   = "${ctx.surface.bg_sunk}"
  base[ACTIVE]   = "${ctx.accent}"
  base[SELECTED] = "${ctx.accent}"
  text[NORMAL]   = "${ctx.text.fg}"
  text[ACTIVE]   = "${ctx.accentOn}"
  text[SELECTED] = "${ctx.accentOn}"
}

class "GtkTextView" style "vivid-life-view"

# A tree view's column headers are GtkButtons, so without their own binding
# they inherit the full button style — a raised control where a flat header
# belongs. Same defect the GTK3 sweep found, in the form gtkrc can express.
style "vivid-life-column-header" {
  bg[NORMAL]   = "${ctx.surface.bg_soft}"
  bg[PRELIGHT] = "${ctx.surface.bg_overlay}"
  fg[NORMAL]   = "${ctx.text.fg_muted}"
  fg[PRELIGHT] = "${ctx.text.fg}"

  xthickness = 1
  ythickness = 0
}

widget_class "*<GtkTreeView>*<GtkButton>*" style "vivid-life-column-header"`;
}

export function contrastPairs(ctx) {
  return [
    {
      label: "text view body",
      fg: ctx.text.fg,
      bg: ctx.surface.bg_sunk,
      rule: "text",
    },
    {
      label: "selected row text",
      fg: ctx.accentOn,
      bg: ctx.accent,
      rule: "text",
    },
    {
      label: "column header label",
      fg: ctx.text.fg_muted,
      bg: ctx.surface.bg_soft,
      rule: "text",
    },
    {
      label: "column header prelight label",
      fg: ctx.text.fg,
      bg: ctx.surface.bg_overlay,
      rule: "text",
    },
  ];
}
```

- [ ] **Step 7: Write the chrome module**

Create `tools/templates/gtk2/chrome.mjs`:

```js
export function render(ctx) {
  return `style "vivid-life-notebook" {
  bg[NORMAL] = "${ctx.surface.bg_sunk}"
  bg[ACTIVE] = "${ctx.surface.bg_soft}"
  fg[NORMAL] = "${ctx.text.fg}"
  fg[ACTIVE] = "${ctx.text.fg_muted}"
}

class "GtkNotebook" style "vivid-life-notebook"

# bg[NORMAL] is the trough; the bar itself is drawn with the selected
# colours, which is why an accent progress bar needs no separate key.
style "vivid-life-progress" {
  bg[NORMAL]   = "${ctx.surface.bg_sunk}"
  bg[PRELIGHT] = "${ctx.accent}"
  bg[SELECTED] = "${ctx.accent}"
  fg[PRELIGHT] = "${ctx.accentOn}"
}

class "GtkProgressBar" style "vivid-life-progress"

# Toolbar buttons are flat until touched, matching the GTK3 and GTK4
# toolbars: chrome buttons that each drew a full raised edge would turn a
# toolbar into a grid.
style "vivid-life-toolbar-button" {
  bg[NORMAL]   = "${ctx.surface.bg_soft}"
  bg[PRELIGHT] = "${ctx.surface.bg_overlay}"
  fg[NORMAL]   = "${ctx.text.fg}"
}

widget_class "*<GtkToolbar>*<GtkButton>" style "vivid-life-toolbar-button"

widget_class "*<GtkComboBox>.<GtkButton>" style "vivid-life-button"`;
}

export function contrastPairs(ctx) {
  return [
    {
      label: "notebook tab label",
      fg: ctx.text.fg,
      bg: ctx.surface.bg_sunk,
      rule: "text",
    },
    {
      label: "inactive tab label",
      fg: ctx.text.fg_muted,
      bg: ctx.surface.bg_soft,
      rule: "text",
    },
    {
      label: "progress fill against its trough",
      fg: ctx.accent,
      bg: ctx.surface.bg_sunk,
      rule: "nontext",
    },
    {
      label: "toolbar button label",
      fg: ctx.text.fg,
      bg: ctx.surface.bg_soft,
      rule: "text",
    },
    {
      label: "toolbar button prelight label",
      fg: ctx.text.fg,
      bg: ctx.surface.bg_overlay,
      rule: "text",
    },
  ];
}
```

`vivid-life-button` is defined in `button.mjs`, which is composed before this module. That ordering is what makes the combo-box binding legal, and the define-before-bind test added in Task 2 is what enforces it.

- [ ] **Step 8: Write the tooltip module**

Create `tools/templates/gtk2/tooltip.mjs`:

```js
export function render(ctx) {
  return `# A widget match, not a class one: GTK 2.12 replaced GtkTooltips with a
# GtkWindow named gtk-tooltip, so there is no class to bind.
style "vivid-life-tooltip" {
  bg[NORMAL] = "${ctx.surface.bg_overlay}"
  fg[NORMAL] = "${ctx.text.fg}"

  xthickness = 4
  ythickness = 4
}

widget "gtk-tooltip*" style "vivid-life-tooltip"`;
}

export function contrastPairs(ctx) {
  return [
    {
      label: "tooltip text",
      fg: ctx.text.fg,
      bg: ctx.surface.bg_overlay,
      rule: "text",
    },
  ];
}
```

- [ ] **Step 9: Compose the four modules**

In `tools/templates/gtk2.mjs`, add the imports and extend the registry:

```js
import * as menu from "./gtk2/menu.mjs";
import * as view from "./gtk2/view.mjs";
import * as chrome from "./gtk2/chrome.mjs";
import * as tooltip from "./gtk2/tooltip.mjs";

export const GTK2_MODULES = [
  tokens,
  base,
  button,
  entry,
  menu,
  view,
  chrome,
  tooltip,
];
```

`chrome` must follow `button`, because it binds `vivid-life-button` to combo-box buttons and gtkrc requires the style to exist first.

- [ ] **Step 10: Run the tests**

Run: `node --test tools/templates/gtk2.test.mjs tools/aa.test.mjs`
Expected: PASS, including the define-before-bind test from Task 2 — if you moved `chrome` above `button`, that test names the style.

- [ ] **Step 11: Regenerate and check**

```bash
npm run generate && npm run check
```

Output is expected to change here; `check` is confirming the committed files match the templates.

- [ ] **Step 12: Confirm GTK2 can actually parse it**

A gtkrc syntax error is not a crash — GTK2 writes a warning to stderr and ignores the rest of the file, so a broken theme looks like an unthemed one rather than like an error. Make the parser tell you:

**The probe must force GTK to initialize, or it proves nothing.** `pinentry-gtk-2 --version` prints and exits before `gtk_init()` ever runs, so the rc file is never parsed and the check passes on _any_ input, including a file with a dangling assignment. Verified: an injected `bg[NORMAL] =` syntax error produced no warning under `--version`, and none under a bare `BYE` either — pinentry initializes GTK lazily, only when it actually has to draw. Driving it to a real dialog with `GETPIN` is what makes the parser run.

```bash
printf 'SETDESC probe\nGETPIN\n' \
  | timeout 25 env GTK2_RC_FILES="$PWD/gtk-2.0/vivid-life-midnight-blue/gtkrc" \
      xvfb-run -a pinentry-gtk-2 2>&1 \
  | grep -iE 'parse|unable|error|warning' || echo "no parser warnings"
```

Expected: `no parser warnings`. Any parse error names the offending line number — fix it before continuing, because everything after that line was discarded.

Both directions of this probe are verified: against the committed gtkrc it prints `no parser warnings`; against a copy with an injected syntax error it prints `<file>:47: error: unexpected character '}', expected string constant`. No `./install.sh --all` is needed — pointing `GTK2_RC_FILES` at the generated file in the repo tests the same content without writing 24 themes into `~/.themes`.

- [ ] **Step 13: Commit**

```bash
git add tools/templates/gtk2.mjs tools/templates/gtk2/ tools/templates/gtk2.test.mjs gtk-2.0/
git commit -m "🎨 feat: extend GTK2 coverage to menus, views, chrome and tooltips

The colour scheme gains the seven keys GTK2 reads directly, which is the
highest-coverage change this target has: those keys reach widgets no style
binding of ours touches. Column headers get their own binding for the same
reason they did in GTK3 — they are GtkButtons, so without one they inherit
the full raised-button style. No engine is required."
```

---

### Task 9: Verify GTK2 against a real application

The spec asks for a spot-check against a real GTK2 application. An `ldd` sweep of `/usr/bin` for links against `libgtk-x11-2.0` found exactly one GTK2 binary on this machine — `pinentry-gtk-2`. `gtk2.0-examples`, which would ship `gtk-demo`, is not in the configured repositories.

**What this verifies and what it does not.** `pinentry-gtk-2` renders a window, labels, an entry and two buttons. That reaches the `GtkWidget`, `GtkEntry` and `GtkButton` bindings and the core colour-scheme keys. It renders **no** menus, notebooks, tree views, toolbars or tooltips, so those bindings are verified only by the parser check in Task 8 Step 12 and by the contrast gate. Record that limitation rather than letting the capture imply broader coverage than it has.

**Files:**

- Create: `tools/preview/gtk2-check.sh`
- Modify: `package.json`, `README.md`

**Interfaces:**

- Consumes: the generated `gtk-2.0/` output from Task 8
- Produces: `npm run preview:gtk2`; PNGs at `tools/preview/out/gtk2-<theme>.png`

- [ ] **Step 1: Write the capture script**

Create `tools/preview/gtk2-check.sh`:

```sh
#!/bin/sh
# Captures a real GTK2 application under two themes.
#
# pinentry-gtk-2 is the only GTK2 binary on a stock Xfce install here, found
# by sweeping /usr/bin for links against libgtk-x11-2.0. It renders a
# window, labels, an entry and two buttons — enough to verify the GtkWidget,
# GtkEntry and GtkButton bindings and the colour scheme, and nothing more.
# Menus, notebooks, tree views and tooltips are NOT covered by this check.
#
# Optional tooling: skips with a message rather than failing a fresh clone.
set -eu

here=$(dirname "$0")
out="$here/out"

if ! command -v pinentry-gtk-2 >/dev/null 2>&1; then
  echo "preview:gtk2 — skipped: no GTK2 application found." >&2
  echo "  (Debian/Ubuntu: sudo apt install pinentry-gtk2)" >&2
  exit 0
fi
if ! command -v xvfb-run >/dev/null 2>&1; then
  echo "preview:gtk2 — skipped: xvfb-run not installed (package xvfb)." >&2
  exit 0
fi
if command -v magick >/dev/null 2>&1; then
  import_cmd="magick import"
elif command -v import >/dev/null 2>&1; then
  import_cmd="import"
else
  echo "preview:gtk2 — skipped: ImageMagick not installed." >&2
  exit 0
fi

# One dark and one light flavor: this is a binding check, not a per-variant
# colour review.
themes="vivid-life-midnight-blue vivid-life-noon-red"

mkdir -p "$out"

for theme in $themes; do
  rc="$HOME/.themes/$theme/gtk-2.0/gtkrc"
  if [ ! -f "$rc" ]; then
    echo "preview:gtk2 — skipped $theme: not installed (run ./install.sh)." >&2
    continue
  fi
  png="$out/gtk2-$theme.png"
  echo "capturing gtk2 under $theme"
  # pinentry speaks Assuan on stdin: SETDESC then GETPIN raises the dialog
  # and holds it until an answer arrives, which is what gives import(1) a
  # window to grab. The feeding subshell sleeps rather than closing stdin
  # immediately, so the dialog stays mapped for the capture.
  xvfb-run -a --server-args="-screen 0 640x400x24" sh -c "
    { printf 'SETDESC Vivid Life GTK2 check\nSETPROMPT Passphrase:\nGETPIN\n'; sleep 6; } \
      | GTK2_RC_FILES='$rc' pinentry-gtk-2 >/dev/null 2>&1 &
    sleep 3
    $import_cmd -window root '$png'
    wait 2>/dev/null || true
  "
  echo "wrote $png"
done
```

Mark it executable: `chmod +x tools/preview/gtk2-check.sh`

- [ ] **Step 2: Register the npm script**

Add to `package.json` `scripts`, after `preview:shots4`:

```json
"preview:gtk2": "sh tools/preview/gtk2-check.sh"
```

- [ ] **Step 3: Lint and run it**

```bash
shellcheck tools/preview/gtk2-check.sh && npm run preview:gtk2
```

Expected: two PNGs in `tools/preview/out/`, or a clean skip.

- [ ] **Step 4: Confirm the capture is not blank**

```bash
magick identify -format '%wx%h stddev=%[standard-deviation]\n' tools/preview/out/gtk2-*.png
```

Expected: a non-trivial standard deviation. A near-zero value means the dialog had not mapped — raise the first `sleep` and re-run. If it stays near zero after two attempts, stop and report it rather than continuing to tune: the check is optional, and a broken harness is not worth more than that.

- [ ] **Step 5: Read the capture against the tokens**

```bash
P=tools/preview/out/gtk2-vivid-life-midnight-blue.png
magick "$P" -format "%[pixel:p{40,40}]\n" info:
```

Sample the dialog background, then the entry and a button (adjust the coordinates to where each landed). Expected for Midnight: background `srgb(23,23,23)` (`bg`), entry `srgb(10,10,10)` (`bg_sunk`), buttons `srgb(64,64,64)` (`bg_soft`). All three reading the same value means the theme did not load at all — check that `GTK2_RC_FILES` pointed at a file that exists.

Confirm the same on the Noon capture, where the ramp runs the other way.

- [ ] **Step 6: Document the check and its limits**

Add to `README.md`, after the optional preview tooling block:

```markdown
### GTK2 verification

`npm run preview:gtk2` captures `pinentry-gtk-2` under two themes. It is the
only GTK2 application present on a stock Xfce install, so the visual check
covers the window, entry and button bindings and the colour scheme only —
menus, notebooks, tree views and tooltips are verified by the gtkrc parser
check and the contrast gate, not visually.
```

- [ ] **Step 7: Commit**

```bash
git add tools/preview/gtk2-check.sh package.json README.md
git commit -m "✨ feat: spot-check GTK2 against a real application

pinentry-gtk-2 is the only GTK2 binary on a stock Xfce install here, found
by sweeping /usr/bin for links against libgtk-x11-2.0. It reaches the
window, entry and button bindings and the colour scheme; the README records
what it does not reach rather than letting the capture imply more."
```

---

### Task 10: Close out phase 4

Every prior task verified one target or one module group. This one verifies the whole, against the spec's definition of done.

**Files:**

- Modify: `docs/superpowers/specs/2026-09-05-gtk-widget-coverage-design.md`
- Modify: `docs/superpowers/plans/2026-09-07-gtk-coverage-phase4.md`

**Interfaces:**

- Consumes: every module from Tasks 1–9
- Produces: no code

- [ ] **Step 1: Confirm no GTK4 node is still unstyled**

The spec's unstyled-node list was written for GTK3. Check the GTK4 equivalents are each matched by a rule:

```bash
for node in menubar '\.toolbar' popover modelbutton dropdown switch spinbutton \
            scale separator columnview listview treeexpander list paned \
            'expander-widget' frame levelbar calendar tooltip \
            '\.navigation-sidebar'; do
  printf '%-18s %s\n' "$node" \
    "$(grep -cE "^[^ ].*$node" gtk-4.0/vivid-life-midnight-blue/gtk.css) rule(s)"
done
```

Expected: every node reports at least 1. A zero is a gap — find which task should have covered it and go back.

- [ ] **Step 2: Confirm the GTK2 binding vocabulary is complete**

```bash
grep -cE '^(class|widget_class|widget) "' gtk-2.0/vivid-life-midnight-blue/gtkrc
```

Expected: at least 14, matching the binding list in the test added in Task 8 Step 1.

- [ ] **Step 3: Run the widget-factory cross-check**

Run: `npm run preview:factory`

If the GTK4 pass captured, open `tools/preview/out/factory4-vivid-life-midnight-blue.png` and look for any widget the factory draws that our gallery does not, and that still renders unthemed. Record what you find.

If it skipped because `gtk-4-examples` is not installed, write that down explicitly in the summary — "not performed, package absent" — rather than treating the spec's definition-of-done item 4 as satisfied for GTK4.

- [ ] **Step 4: Review all four GTK4 contact sheets**

Run: `npm run preview:shots4`

Open `contact-gtk4-midnight.png`, `contact-gtk4-twilight.png`, `contact-gtk4-dawn.png` and `contact-gtk4-noon.png`. Twilight and Dawn are the ones to look hardest at: Twilight has the narrowest surface ramp (`bg` `#404040` against `bg_soft` `#525252`), and Dawn is the light flavor where a boundary derived for dark flavors is most likely to read as heavy.

- [ ] **Step 5: Confirm GTK3 did not regress**

Task 3 rewrote the shared contrast gate and Tasks 1–2 touched the shared `buildContext` consumers. GTK3 is not supposed to have moved:

```bash
npm run preview:shots
```

Compare `contact-midnight.png` against the version from the phase 3 merge (`391d101`). Any visible difference means a shared change leaked into GTK3 — `npm run check` would not catch it if the templates and the committed output moved together.

```bash
git diff 391d101 --stat -- gtk-3.0/
```

Expected: no output. GTK3's generated files must be byte-identical to phase 3's.

- [ ] **Step 6: Spot-check the real applications**

The spec's definition of done item 5, for the targets this plan touched. With a Vivid Life theme selected:

- A GTK4 application — `gtk4-widget-factory` if installed, otherwise any GTK4 app that does not use libadwaita. Confirm surfaces, buttons, entries and lists are themed. Note that libadwaita apps are **expected** to ignore this stylesheet; that is documented, not a defect.
- `pinentry-gtk-2` via `npm run preview:gtk2` — the GTK2 check from Task 9.
- Thunar, xfce4-terminal and the Appearance dialog — confirm phase 3's GTK3 coverage still looks right after the shared-gate change.

Note anything that still looks wrong. A finding here becomes the next plan's input, not a reason to keep patching this one.

- [ ] **Step 7: Run the full suite**

Run: `npm test`
Expected: all tests pass. This takes roughly 6 minutes; the xfwm4 rasterization dominates. Run it in the background and wait once — do not poll.

Record the result here as a quoted line, the way phase 2's Task 10 Step 5 did.

- [ ] **Step 8: Record the outcome in the spec**

In `docs/superpowers/specs/2026-09-05-gtk-widget-coverage-design.md`, mark Sequencing step 4 complete with the commit range, mirroring how step 3 was marked. Add two notes to the spec that later work depends on:

- The GTK4 node inventory differs from GTK3 in thirteen documented ways, and the extraction command that produces the authoritative list. Point at this plan's reference section rather than repeating the table.
- GTK2 visual verification is limited to `pinentry-gtk-2` on this machine; menus, notebooks, tree views and tooltips are gate-verified only.

If Step 3 or Step 6 turned up anything, add it to the spec's "Known fixes" section so the next plan inherits it.

- [ ] **Step 9: Commit**

```bash
git add docs/superpowers/specs/2026-09-05-gtk-widget-coverage-design.md docs/superpowers/plans/2026-09-07-gtk-coverage-phase4.md
git commit -m "📝 docs: record the GTK4 and GTK2 coverage phase as complete"
```

---

## Out of scope for this plan

- **libadwaita applications.** They follow libadwaita's own accent-colour system and largely ignore this stylesheet. The GTK4 file already documents this and the test asserts the note is present. Making them follow the theme would mean shipping a libadwaita stylesheet, which is a different deliverable with a different upstream contract.
- **Whisker Menu two-tone.** Still unreproduced by the GTK3 gallery, still needs `GTK_DEBUG=interactive` against the running popup to find which node paints `bg_overlay` on one pane and not the other. Unchanged by this plan; it remains its own plan.
- **Retrofitting phase 1's literal geometry onto the spacing scale.** The GTK3 modules written before `ctx.space` existed still carry literal pixel values. The GTK4 modules in this plan use the scales throughout, so the two targets are inconsistent on purpose — changing GTK3 is a visual change with no coverage benefit and belongs in its own commit if it is wanted at all.
- **A GTK2 engine.** `libmurrine` and `libpixmap` are installed here, but requiring either would break the theme on systems that lack them. If GTK2 ever needs gradients or asset-drawn widgets, that is a deliberate dependency decision, not a coverage task.
- **Pixel-diffing visual regression in CI.** Unchanged from the spec's non-goals: the harness renders images for human review and does not assert on them.
