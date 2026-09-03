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

// Every foreground/background pair the four templates emit.
// Pairs involving text.fg_disabled are exempt: WCAG 1.4.3 excludes text
// that is part of an inactive user-interface component. The exemption is
// this named list, not a blanket skip on the token.
function pairsFor(flavor, variant) {
  const b = flavorBlock(flavor);
  const accent = resolveAccent(flavor, variant);
  const on = accentOn(flavor);
  const sunk = b.surface.bg_sunk;

  return [
    // Xfwm4 frame
    ["xfwm4 active title", b.text.fg, sunk],
    ["xfwm4 inactive title", b.text.fg_muted, sunk],
    ["xfwm4 button rest glyph", b.text.fg_muted, sunk],
    ["xfwm4 button inactive glyph", b.text.fg_muted, sunk],
    ["xfwm4 button prelight glyph", b.text.fg, composite(sunk, b.state.hover)],
    ["xfwm4 button pressed glyph", b.text.fg, composite(sunk, b.state.active)],
    // GTK, all three templates
    ["gtk window text", b.text.fg, b.surface.bg],
    ["gtk button text", b.text.fg, b.surface.bg_soft],
    ["gtk entry text", b.text.fg, sunk],
    ["gtk menu/tooltip text", b.text.fg, b.surface.bg_overlay],
    ["gtk notebook tab text", b.text.fg_muted, b.surface.bg_soft],
    ["gtk2/gtk4 button prelight", b.text.fg, b.border.default],
    ["gtk3 button hover", b.text.fg, shade(b.surface.bg_soft, 1.08)],
    ["gtk accent button text", on, accent],
    ["gtk destructive button text", on, b.semantic.danger],
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

test("the fg_disabled exemption is recorded, not silently skipped", () => {
  // Documented exemption, WCAG 1.4.3 (incidental text in an inactive
  // component). Asserted as a known failure so that if the design system
  // ever raises fg_disabled, this test tells us the exemption can go.
  const midnight = flavorBlock("midnight");
  assert.ok(
    contrastRatio(midnight.text.fg_disabled, midnight.surface.bg_soft) < AA,
  );
});
