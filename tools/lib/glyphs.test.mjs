import { test } from "node:test";
import assert from "node:assert/strict";
import { loadGlyph } from "./glyphs.mjs";

test("loadGlyph returns the drawable children without the root svg", () => {
  const markup = loadGlyph("x");
  assert.match(markup, /<path/);
  assert.doesNotMatch(markup, /<svg/);
  assert.doesNotMatch(markup, /<\/svg>/);
});

test("loadGlyph reads every glyph the window buttons need", () => {
  for (const name of [
    "menu",
    "minus",
    "x",
    "chevron-up",
    "chevron-down",
    "square",
    "copy",
    "pin",
    "pin-off",
  ]) {
    assert.match(loadGlyph(name), /<(path|rect|circle|line)/, name);
  }
});

test("loadGlyph names the missing glyph when it cannot be resolved", () => {
  assert.throws(
    () => loadGlyph("definitely-not-a-glyph"),
    /definitely-not-a-glyph/,
  );
});
