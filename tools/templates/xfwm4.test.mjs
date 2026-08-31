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
