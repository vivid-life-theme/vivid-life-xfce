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
