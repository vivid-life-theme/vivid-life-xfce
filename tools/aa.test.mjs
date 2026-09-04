import { test } from "node:test";
import assert from "node:assert/strict";
import { contrastRatio, composite, parseHex } from "./lib/contrast.mjs";
import {
  allCombinations,
  flavorBlock,
  resolveAccent,
  accentOn,
} from "./lib/tokens.mjs";

const AA = 4.5;
// WCAG 1.4.3 governs text; non-text UI components (scrollbar sliders, focus
// indicators, control borders) fall under 1.4.11 at a lower 3:1 floor. Kept
// as a separate constant and a separate pair list so the two criteria never
// get conflated in one assertion.
const AA_NONTEXT = 3;

// GTK's shade(): multiply HSL lightness, clamp to [0,1].
function shade(hex, factor) {
  const [r255, g255, b255] = parseHex(hex);
  const [r, g, b] = [r255 / 255, g255 / 255, b255 / 255];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  let l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  l = Math.min(1, Math.max(0, l * factor));
  const hue = (p, q, t0) => {
    let t = t0;
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const toByte = (v) =>
    Math.round(v * 255)
      .toString(16)
      .padStart(2, "0");
  if (s === 0) return `#${toByte(l)}${toByte(l)}${toByte(l)}`;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return `#${toByte(hue(p, q, h + 1 / 3))}${toByte(hue(p, q, h))}${toByte(hue(p, q, h - 1 / 3))}`;
}

// The foreground/background pairs asserted by this suite. Not every pair
// the templates emit is listed — see the per-block comments below for what
// each group covers and which template(s) it applies to.
// Pairs involving text.fg_disabled are exempt: WCAG 1.4.3 excludes text
// that is part of an inactive user-interface component. The exemption is
// this named list, not a blanket skip on the token.
function pairsFor(flavor, variant) {
  const b = flavorBlock(flavor);
  const accent = resolveAccent(flavor, variant);
  const on = accentOn(flavor);
  const sunk = b.surface.bg_sunk;

  return [
    // Xfwm4 frame. Note: today's tools/generate.mjs still renders buttons
    // the legacy way (text.fg on surface.bg_soft, inactive state via
    // opacity: 0.5), so the prelight/pressed pairs below assert values
    // nothing currently emits. Plan Task 8 deletes that renderer in favour
    // of buttonStateColors, which draws rest/inactive as fg_muted on a bare
    // bg_sunk canvas, prelight as fg on composite(bg_sunk, state.hover),
    // and pressed as fg on composite(bg_sunk, state.active); Task 10 then
    // generates the prelight/pressed assets this suite is gating for.
    // surface.bg_sunk is the titlebar background per the design spec
    // (derived from the design system's own chrome bar) — not yet stated
    // in any other file in this repo.
    ["xfwm4 active title", b.text.fg, sunk],
    ["xfwm4 inactive title", b.text.fg_muted, sunk],
    ["xfwm4 button rest glyph", b.text.fg_muted, sunk],
    ["xfwm4 button inactive glyph", b.text.fg_muted, sunk],
    ["xfwm4 button prelight glyph", b.text.fg, composite(sunk, b.state.hover)],
    ["xfwm4 button pressed glyph", b.text.fg, composite(sunk, b.state.active)],
    // GTK. Shared across gtk2/gtk3/gtk4 except where noted.
    ["gtk window text", b.text.fg, b.surface.bg],
    ["gtk button text", b.text.fg, b.surface.bg_soft],
    ["gtk entry text", b.text.fg, sunk],
    // gtk3 only — gtk2.mjs has no menu/tooltip styling.
    ["gtk menu/tooltip text", b.text.fg, b.surface.bg_overlay],
    // gtk3 only — notebook styling exists only in gtk3.mjs.
    ["gtk notebook tab text", b.text.fg_muted, b.surface.bg_soft],
    ["gtk2/gtk4 button prelight", b.text.fg, b.border.default],
    ["gtk3 button hover", b.text.fg, shade(b.surface.bg_soft, 1.08)],
    ["gtk accent button text", on, accent],
    // gtk3 only — destructive-action exists only in gtk3.mjs.
    ["gtk destructive button text", on, b.semantic.danger],
    // *:selected is a universal selector with no single backdrop, so
    // gtk3.mjs paints it with the opaque state.selection token rather than
    // a translucent accent. One determinate pair, not four speculative ones.
    ["gtk3 selection", b.text.fg, b.state.selection],
    // gtk3.mjs composites this one over whatever is behind it. GTK's
    // alpha(colour, f) becomes an #rrggbbaa overlay: 0.2 -> 33. menuitem
    // paints bg_overlay itself, so this backdrop is determinate.
    [
      "gtk3 menuitem hover",
      b.text.fg,
      composite(b.surface.bg_overlay, `${accent}33`),
    ],
    // gtk3.mjs sets .warning/.error/.success as foregrounds with no
    // background of their own, so they inherit whichever surface the
    // ancestor painted. All four are asserted.
    ...["bg", "bg_sunk", "bg_soft", "bg_overlay"].flatMap((surf) => [
      [`gtk3 warning text on ${surf}`, b.semantic.warning, b.surface[surf]],
      [`gtk3 error text on ${surf}`, b.semantic.danger, b.surface[surf]],
      [`gtk3 success text on ${surf}`, b.semantic.success, b.surface[surf]],
    ]),
  ];
}

for (const { flavor, variant } of allCombinations()) {
  test(`WCAG AA — ${flavor} ${variant}`, () => {
    for (const [label, fg, bg] of pairsFor(flavor, variant)) {
      const ratio = contrastRatio(fg, bg);
      assert.ok(
        ratio >= AA,
        `${label}: ${fg} on ${bg} is ${ratio.toFixed(2)}:1, below ${AA}:1`,
      );
    }
  });
}

// gtk3.mjs/gtk4.mjs — scrollbar slider has no widget of its own behind it,
// so its effective backdrop is whatever the scrolled content painted, which
// is surface.bg in this theme (see "gtk window text" above). This is the
// only non-text UI component painted from a token today; add to this list
// as more are.
function nonTextPairsFor(flavor) {
  const b = flavorBlock(flavor);
  return [["gtk scrollbar slider", b.text.fg_subtle, b.surface.bg]];
}

for (const flavor of ["midnight", "twilight", "dawn", "noon"]) {
  test(`WCAG 1.4.11 (non-text UI, 3:1) — ${flavor}`, () => {
    for (const [label, fg, bg] of nonTextPairsFor(flavor)) {
      const ratio = contrastRatio(fg, bg);
      assert.ok(
        ratio >= AA_NONTEXT,
        `${label}: ${fg} on ${bg} is ${ratio.toFixed(2)}:1, below ${AA_NONTEXT}:1`,
      );
    }
  });
}

test("the fg_disabled exemption is recorded, not silently skipped", () => {
  // Documented exemption, WCAG 1.4.3 (incidental text in an inactive
  // component). Asserted as a known failure so that if the design system
  // ever raises fg_disabled, this test tells us the exemption can go.
  const midnight = flavorBlock("midnight");
  const ratio = contrastRatio(
    midnight.text.fg_disabled,
    midnight.surface.bg_soft,
  );
  assert.ok(
    ratio < AA,
    `fg_disabled on bg_soft: ${midnight.text.fg_disabled} on ${midnight.surface.bg_soft} is ${ratio.toFixed(2)}:1, expected below ${AA}:1`,
  );
});
