import { test } from "node:test";
import assert from "node:assert/strict";
import {
  renderThemerc,
  renderButtonSvg,
  BUTTON_KINDS,
  TOGGLED_KINDS,
  BUTTON_STATES,
  GLYPH_FOR,
  buttonMatrix,
  buttonStateColors,
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

test("BUTTON_KINDS lists all six Xfwm4 buttons", () => {
  assert.deepEqual(BUTTON_KINDS, [
    "menu",
    "stick",
    "shade",
    "hide",
    "maximize",
    "close",
  ]);
  assert.deepEqual(TOGGLED_KINDS, ["stick", "shade", "maximize"]);
  assert.deepEqual(BUTTON_STATES, [
    "active",
    "inactive",
    "prelight",
    "pressed",
  ]);
});

test("buttonMatrix yields 36 uniquely named assets", () => {
  const matrix = buttonMatrix();
  assert.equal(matrix.length, 36);
  assert.equal(new Set(matrix.map((e) => e.name)).size, 36);
  assert.ok(matrix.some((e) => e.name === "close-prelight"));
  assert.ok(matrix.some((e) => e.name === "stick-toggled-active"));
  assert.equal(
    matrix.some((e) => e.name === "close-toggled-active"),
    false,
  );
});

test("GLYPH_FOR maps every matrix entry to a real Lucide name", () => {
  for (const entry of buttonMatrix()) {
    assert.equal(typeof GLYPH_FOR[entry.base], "string", entry.base);
    assert.equal(entry.glyph, GLYPH_FOR[entry.base]);
  }
  assert.equal(GLYPH_FOR.close, "x");
  assert.equal(GLYPH_FOR["shade-toggled"], "chevron-down");
  assert.equal(GLYPH_FOR["maximize-toggled"], "copy");
});

test("buttonStateColors composites the hover overlay instead of using opacity", () => {
  const midnight = flavorBlock("midnight");
  const prelight = buttonStateColors(midnight, "#93c5fd", "prelight");
  // surface.bg_sunk #0a0a0a + state.hover #ffffff14
  assert.equal(prelight.backing, "#1d1d1d");
  assert.equal(prelight.glyph, midnight.text.fg);
  assert.equal(prelight.edge, "#93c5fd");
});

test("buttonStateColors leaves rest and inactive states unbacked", () => {
  const midnight = flavorBlock("midnight");
  const rest = buttonStateColors(midnight, "#93c5fd", "active");
  const inactive = buttonStateColors(midnight, "#93c5fd", "inactive");
  assert.equal(rest.backing, null);
  assert.equal(inactive.backing, null);
  assert.equal(rest.glyph, midnight.text.fg_muted);
  assert.equal(inactive.glyph, midnight.text.fg_muted);
  assert.equal(inactive.edge, midnight.border.subtle);
});

test("buttonStateColors' edge matches renderTitleXpm's edge for the same flavour and accent", () => {
  // The title segments and the button slots paint the same 2px row of the
  // titlebar; a mismatch here would render as a visible seam mid-titlebar.
  for (const flavor of ["midnight", "dawn"]) {
    const block = flavorBlock(flavor);
    const accent = resolveAccent(flavor, "blue");

    const titleActive = renderTitleXpm({
      flavorBlock: block,
      accentHex: accent,
      active: true,
      segment: 1,
    });
    const titleInactive = renderTitleXpm({
      flavorBlock: block,
      accentHex: accent,
      active: false,
      segment: 1,
    });

    assert.match(
      titleActive,
      new RegExp(`c ${buttonStateColors(block, accent, "active").edge}`),
    );
    assert.match(
      titleInactive,
      new RegExp(`c ${buttonStateColors(block, accent, "inactive").edge}`),
    );
  }
});

test("renderButtonSvg produces an opaque 24x32 canvas with the glyph inlined", () => {
  const svg = renderButtonSvg({
    flavorBlock: flavorBlock("noon"),
    accentHex: "#1d4ed8",
    glyphMarkup: '<path d="M18 6 6 18"/>',
    state: "pressed",
  });
  assert.match(svg, /<svg[^>]*width="24"[^>]*height="32"/);
  assert.match(svg, /<rect width="24" height="32" fill="#d4d4d4"/); // noon surface.bg_sunk
  assert.match(svg, /translate\(4,8\) scale\(0\.66667\)/);
  assert.match(svg, /stroke-width="2\.25"/);
  assert.match(svg, /M18 6 6 18/);
  assert.doesNotMatch(svg, /opacity/);
});

test("renderButtonSvg throws on an unknown state", () => {
  assert.throws(
    () =>
      renderButtonSvg({
        flavorBlock: flavorBlock("noon"),
        accentHex: "#1d4ed8",
        glyphMarkup: "<path/>",
        state: "hovering",
      }),
    /Unknown button state/,
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
