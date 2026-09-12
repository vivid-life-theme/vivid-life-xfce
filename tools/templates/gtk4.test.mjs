import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderGtk4Css, GTK4_MODULES } from "./gtk4.mjs";
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
    "switch > slider",
    "scale > trough > slider",
    "spinbutton > text",
    "levelbar",
    "spinner",
    "dropdown",
    ".linked",
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
  ]) {
    assert.ok(css.includes(selector), `expected CSS to style ${selector}`);
  }
});

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

/* A surface rule like `.navigation-sidebar row { background-color: transparent }`
   has specificity (0,1,1) and beats bare `:selected` (0,1,0), so a row that
   paints its own background silently loses its selection highlight unless
   selection.mjs restates the pair explicitly. That is the whole reason
   selection.mjs exists, but nothing enforced it: `.navigation-sidebar` was added
   to the sidebar module without its counterpart and shipped a sidebar whose
   selected row rendered transparent. This gate makes that omission impossible
   to repeat.

   Scope, deliberately: this matches only a CLASS-bearing descendant form
   (`.foo row`). Only a class can outrank `:selected`. `.sidebar row` is (0,1,1)
   and wins, so it needs the restatement. `placessidebar row` is (0,0,2) — two
   type selectors, no class — and loses to `:selected`'s (0,1,0) on the class
   column, exactly as `listview > row` does; neither needs restating, and
   demanding it would assert a requirement specificity does not impose.
   (selection.mjs does list the two bare-type sidebar forms anyway; harmless,
   just not load-bearing.) If a combinator form ever gains a class
   (`.foo > row`), widen the pattern to match it. */
test("every sidebar row surface has a :selected restatement", () => {
  const midnight = flavorBlock("midnight");
  const css = renderGtk4Css(
    midnight,
    resolveAccent("midnight", "blue"),
    accentOn("midnight"),
  );
  const rowSelectors = new Set(
    [...css.matchAll(/^(\.[\w.-]+ row)[,{ ]/gm)].map((m) => m[1]),
  );
  assert.ok(rowSelectors.size > 0, "found no `X row` selectors to check");
  for (const selector of rowSelectors) {
    assert.ok(
      css.includes(`${selector}:selected`),
      `${selector} paints a row surface but ${selector}:selected is never restated — selected rows will render unhighlighted`,
    );
  }
});
