import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderGtk3Css, GTK3_MODULES } from "./gtk3.mjs";
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
    "frame",
    "separator",
    ".view",
    "infobar",
    "levelbar",
    "spinner",
    "scale",
    "spinbutton",
    "combobox",
    "treeview",
    "iconview",
    "list row",
    "menubar",
    "popover",
    // The real Whisker Menu window, by widget name — not the two-listbox
    // stand-in the gallery used to model it.
    "#whiskermenu-window",
    // A checked flat button: .flat (0,1,1) is composed after :checked (0,1,1)
    // and strips the accent fill by source order while leaving accent_on
    // text behind — fill-text on no fill. Whisker's active category showed it.
    "button.flat:checked",
    "toolbar",
    "actionbar",
    "paned",
    ".sidebar",
    ".linked",
    "calendar",
    "expander",
    // Phase 5. `block.filled` matched nothing — no such class exists in GTK3
    // or GTK4 — so a mid-range level bar drew no fill at all for two phases.
    "levelbar block:not(.empty)",
    // And the spinner was an invisible box: colour and size only, when GTK's
    // own sheet makes it visible via opacity toggled by :checked.
    "spinner:checked",
    "@keyframes spin",
    // Semantic text inside a selected row: 72 of 72 pairs fail 4.5:1 in its
    // own colour, so it is promoted to accent_on like .dim-label already is.
    "*:selected .warning",
  ]) {
    assert.ok(css.includes(selector), `expected CSS to style ${selector}`);
  }
});

// A module file that exists but is never composed produces no CSS and no
// error — exactly the silent gap the module split could otherwise introduce.
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

/* A GtkListBox is a surface, not a row wrapper. Grouping bare `list` into the
   "rows stay transparent" rule left it with no background at all, so a list
   beside a tree view rendered on two different surfaces — Whisker Menu's two
   panes, measured at bg_sunk vs bg. The same defect was fixed on GTK4 in
   phase 4 and never carried here. This asserts `list` sits in the sunk-surface
   rule and NOT in the transparent one, which a presence check cannot tell. */
test("a GTK3 list box gets the sunk surface, not transparency", () => {
  const css = renderGtk3Css(
    flavorBlock("noon"),
    resolveAccent("noon", "red"),
    accentOn("noon"),
  );
  const sunkRule = css.match(/^treeview\.view,[^{]*\{[^}]*\}/m)?.[0] ?? "";
  assert.ok(
    /^list,$/m.test(sunkRule) || /^list \{/m.test(sunkRule),
    "`list` must be a selector of the bg_sunk surface rule",
  );
  assert.ok(
    !/^list,\nlist row \{\n\s*background-color: transparent/m.test(css),
    "bare `list` must not be in the transparent-rows rule",
  );
});
