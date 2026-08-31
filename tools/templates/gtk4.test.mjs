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
