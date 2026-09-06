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
    "toolbar",
    "actionbar",
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
