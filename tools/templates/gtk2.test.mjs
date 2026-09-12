import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderGtk2Gtkrc, GTK2_MODULES } from "./gtk2.mjs";
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
  let bindings = 0;
  let bindingShapedLines = 0;
  for (const line of gtkrc.split("\n")) {
    // Deliberately loose: any line that looks like a binding at all, however
    // it is spaced or quoted. The strict regex below must match every one of
    // them, which is the property actually being protected.
    if (/^\s*(?:class|widget_class|widget)\s/.test(line))
      bindingShapedLines += 1;
    const declaration = line.match(/^style "([^"]+)"/);
    if (declaration) {
      defined.add(declaration[1]);
      continue;
    }
    const binding = line.match(
      /^(?:class|widget_class|widget) "[^"]+" style "([^"]+)"/,
    );
    if (binding) {
      bindings += 1;
      assert.ok(
        defined.has(binding[1]),
        `binding references style "${binding[1]}" before it is defined`,
      );
    }
  }
  assert.ok(defined.size >= 3, "no styles found — the composition lost them");
  // The bindings are the side that does the asserting, so this gate proves
  // nothing unless the strict regex matched. Comparing against the style count
  // is not enough: four styles are bound twice, so that form has four lines of
  // slack and up to four bindings could slip out of the strict regex — exactly
  // the "emitted with leading indentation" case — while still passing. The
  // property actually meant is that the strict regex matched EVERY
  // binding-shaped line, so compare the two counts directly.
  assert.equal(
    bindings,
    bindingShapedLines,
    `the strict binding regex matched ${bindings} of ${bindingShapedLines} binding-shaped lines — it regressed, and the unmatched ones were never checked`,
  );
});

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
