import { test } from "node:test";
import assert from "node:assert/strict";
import { renderThemerc, renderButtonSvg, BUTTON_KINDS } from "./xfwm4.mjs";
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
