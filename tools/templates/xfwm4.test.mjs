import { test } from "node:test";
import assert from "node:assert/strict";
import {
  renderThemerc,
  renderButtonSvg,
  BUTTON_KINDS,
  TITLE_SEGMENTS,
  EDGES,
  renderTitleXpm,
  renderEdgeXpm,
  renderTopCornerSvg,
  renderBottomCornerSvg,
} from "./xfwm4.mjs";
import { flavorBlock, resolveAccent, accentOn } from "../lib/tokens.mjs";

test("renderThemerc uses fg_muted for inactive text so all flavors clear AA", () => {
  const midnight = flavorBlock("midnight");
  const themerc = renderThemerc(
    midnight,
    resolveAccent("midnight", "blue"),
    accentOn("midnight"),
  );
  // text.fg_muted, not text.fg_subtle: #737373 on bg_sunk #0a0a0a is 4.18:1.
  assert.match(themerc, /^inactive_text_color=#d4d4d4$/m);
  assert.match(themerc, /^active_text_color=#f5f5f5$/m);
});

test("renderThemerc does not emit the invalid *_shadow_color keys", () => {
  const themerc = renderThemerc(
    flavorBlock("dawn"),
    resolveAccent("dawn", "purple"),
    accentOn("dawn"),
  );
  assert.doesNotMatch(themerc, /^active_shadow_color=/m);
  assert.doesNotMatch(themerc, /^inactive_shadow_color=/m);
});

test("renderThemerc emits the frame geometry keys", () => {
  const themerc = renderThemerc(
    flavorBlock("noon"),
    resolveAccent("noon", "green"),
    accentOn("noon"),
  );
  for (const line of [
    "button_offset=4",
    "button_spacing=2",
    "title_horizontal_offset=12",
    "title_vertical_offset_active=0",
    "title_vertical_offset_inactive=0",
    "maximized_offset=0",
    "show_app_icon=false",
    "full_width_title=true",
    "title_alignment=left",
  ]) {
    assert.match(themerc, new RegExp(`^${line}$`, "m"));
  }
});

test("renderThemerc maps shadows.lg onto the drop-shadow keys", () => {
  const themerc = renderThemerc(
    flavorBlock("twilight"),
    resolveAccent("twilight", "red"),
    accentOn("twilight"),
  );
  assert.match(themerc, /^shadow_delta_y=-12$/m);
  assert.match(themerc, /^shadow_opacity=18$/m);
  assert.match(themerc, /^show_frame_shadow=true$/m);
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

test("TITLE_SEGMENTS and EDGES enumerate the flat frame assets", () => {
  assert.deepEqual(TITLE_SEGMENTS, [1, 2, 3, 4, 5]);
  assert.deepEqual(EDGES, ["left", "right", "bottom"]);
});

test("renderTitleXpm is 2x32 with a 2px accent edge when active", () => {
  const xpm = renderTitleXpm({
    flavorBlock: flavorBlock("midnight"),
    accentHex: "#93c5fd",
    active: true,
    segment: 1,
  });
  assert.match(xpm, /^"2 32 2 1",$/m);
  assert.match(xpm, /c #0a0a0a/); // surface.bg_sunk
  assert.match(xpm, /c #93c5fd/); // accent, the focus edge
  const pixelRows = xpm.split("\n").filter((l) => /^"[ab]{2}"/.test(l));
  assert.equal(pixelRows.length, 32);
  // Last two rows are the focus edge, the 30 above are the titlebar fill.
  assert.equal(pixelRows[29][1], pixelRows[0][1]);
  assert.equal(pixelRows[30][1], pixelRows[31][1]);
  assert.notEqual(pixelRows[31][1], pixelRows[0][1]);
});

test("renderTitleXpm uses border.subtle for the edge when inactive", () => {
  const xpm = renderTitleXpm({
    flavorBlock: flavorBlock("midnight"),
    accentHex: "#93c5fd",
    active: false,
    segment: 3,
  });
  assert.match(xpm, /c #262626/); // border.subtle
  assert.doesNotMatch(xpm, /c #93c5fd/);
});

test("renderEdgeXpm is a 1x1 border.default pixel", () => {
  const xpm = renderEdgeXpm({
    flavorBlock: flavorBlock("noon"),
    edge: "left",
    active: true,
  });
  assert.match(xpm, /^"1 1 1 1",$/m);
  assert.match(xpm, /c #d4d4d4/); // noon border.default
});

test("renderTopCornerSvg is 8x32 and rounds only the outer top corner", () => {
  const svg = renderTopCornerSvg({
    flavorBlock: flavorBlock("dawn"),
    accentHex: "#1d4ed8",
    side: "left",
    active: true,
  });
  assert.match(svg, /<svg[^>]*width="8"[^>]*height="32"/);
  assert.match(svg, /A ?8 ?8/); // the 8px arc
  assert.match(svg, /fill="#1d4ed8"/); // focus edge
});

test("renderTopCornerSvg mirrors for the right side", () => {
  const left = renderTopCornerSvg({
    flavorBlock: flavorBlock("dawn"),
    accentHex: "#1d4ed8",
    side: "left",
    active: true,
  });
  const right = renderTopCornerSvg({
    flavorBlock: flavorBlock("dawn"),
    accentHex: "#1d4ed8",
    side: "right",
    active: true,
  });
  assert.notEqual(left, right);
  assert.match(right, /scale\(-1,1\)/);
});

test("renderBottomCornerSvg is 16x16 with a 1px border and no fill", () => {
  const svg = renderBottomCornerSvg({
    flavorBlock: flavorBlock("twilight"),
    side: "left",
  });
  assert.match(svg, /<svg[^>]*width="16"[^>]*height="16"/);
  assert.match(svg, /fill="#171717"/); // twilight border.default
  // Two 1px strips only — never a filled 16x16 block.
  assert.doesNotMatch(svg, /width="16"[^>]*height="16"[^>]*fill="#171717"/);
});

test("renderTopCornerSvg rejects an unknown side", () => {
  assert.throws(
    () =>
      renderTopCornerSvg({
        flavorBlock: flavorBlock("noon"),
        accentHex: "#1d4ed8",
        side: "middle",
        active: true,
      }),
    /Unknown side/,
  );
});
