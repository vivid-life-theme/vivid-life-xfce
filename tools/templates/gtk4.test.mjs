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
