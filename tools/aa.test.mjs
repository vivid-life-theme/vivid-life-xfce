import { test } from "node:test";
import assert from "node:assert/strict";
import { contrastRatio, composite } from "./lib/contrast.mjs";
import {
  allCombinations,
  flavorBlock,
  resolveAccent,
  accentOn,
} from "./lib/tokens.mjs";
import { buildContext } from "./templates/context.mjs";
import { GTK3_MODULES } from "./templates/gtk3.mjs";

const AA = 4.5;
// WCAG 1.4.3 governs text; non-text UI components (scrollbar sliders, focus
// indicators, control borders) fall under 1.4.11 at a lower 3:1 floor. Each
// pair declares which criterion it is measured against via `rule`, so the two
// never get conflated in one assertion.
const AA_NONTEXT = 3;

// The GTK3 pairs are not listed here. Every gtk3 template module declares the
// pairs it emits next to the CSS that emits them, and this walk collects them
// — so a new widget module cannot ship colors the gate has never seen.
function gtkPairsFor(flavor, variant) {
  const ctx = buildContext(
    flavorBlock(flavor),
    resolveAccent(flavor, variant),
    accentOn(flavor),
  );
  return GTK3_MODULES.flatMap((m) =>
    m.contrastPairs ? m.contrastPairs(ctx) : [],
  );
}

// gtk2.mjs, gtk4.mjs and xfwm4.mjs are not split into modules, so their pairs
// stay an explicit list.
function otherPairsFor(flavor, variant) {
  const b = flavorBlock(flavor);
  const accent = resolveAccent(flavor, variant);
  const sunk = b.surface.bg_sunk;
  const text = (label, fg, bg) => ({ label, fg, bg, rule: "text" });

  return [
    // Xfwm4 frame. Note: today's tools/generate.mjs still renders buttons
    // the legacy way (text.fg on surface.bg_soft, inactive state via
    // opacity: 0.5), so the prelight/pressed pairs below assert values
    // nothing currently emits. A later plan deletes that renderer in favour
    // of buttonStateColors, which draws rest/inactive as fg_muted on a bare
    // bg_sunk canvas, prelight as fg on composite(bg_sunk, state.hover),
    // and pressed as fg on composite(bg_sunk, state.active).
    // surface.bg_sunk is the titlebar background per the design spec
    // (derived from the design system's own chrome bar).
    text("xfwm4 active title", b.text.fg, sunk),
    text("xfwm4 inactive title", b.text.fg_muted, sunk),
    text("xfwm4 button rest glyph", b.text.fg_muted, sunk),
    text("xfwm4 button inactive glyph", b.text.fg_muted, sunk),
    text(
      "xfwm4 button prelight glyph",
      b.text.fg,
      composite(sunk, b.state.hover),
    ),
    text(
      "xfwm4 button pressed glyph",
      b.text.fg,
      composite(sunk, b.state.active),
    ),
    // gtk2/gtk4 only — the gtk3 equivalents come from the module walk.
    text("gtk2/gtk4 window text", b.text.fg, b.surface.bg),
    text("gtk2/gtk4 button text", b.text.fg, b.surface.bg_soft),
    text("gtk2/gtk4 entry text", b.text.fg, sunk),
    text("gtk2/gtk4 button prelight", b.text.fg, b.border.default),
    text("gtk2/gtk4 accent button text", accentOn(flavor), accent),
  ];
}

for (const { flavor, variant } of allCombinations()) {
  test(`WCAG — ${flavor} ${variant}`, () => {
    for (const pair of [
      ...gtkPairsFor(flavor, variant),
      ...otherPairsFor(flavor, variant),
    ]) {
      if (pair.exempt) continue;
      const min = pair.rule === "nontext" ? AA_NONTEXT : AA;
      const ratio = contrastRatio(pair.fg, pair.bg);
      assert.ok(
        ratio >= min,
        `${pair.label}: ${pair.fg} on ${pair.bg} is ${ratio.toFixed(2)}:1, below ${min}:1`,
      );
    }
  });
}

// An exemption is a claim that a pair cannot meet its criterion, so it is
// asserted as a known failure — if the design system ever raises the token
// behind one, this test says the exemption can go. The claim is per-token,
// not per-flavor: text.fg_disabled on bg_soft is 1.33:1 on Midnight but
// 4.74:1 on Noon, so requiring every combination to fail would make the
// gate fail on a flavor where the colors happen to be fine. One combination
// still failing is what keeps the exemption earning its place.
test("every exemption is still needed", () => {
  const clears = new Map();
  for (const { flavor, variant } of allCombinations()) {
    for (const pair of gtkPairsFor(flavor, variant)) {
      if (!pair.exempt) continue;
      const min = pair.rule === "nontext" ? AA_NONTEXT : AA;
      const stale = contrastRatio(pair.fg, pair.bg) >= min;
      const seen = clears.get(pair.label);
      clears.set(pair.label, {
        exempt: pair.exempt,
        min,
        allClear: (seen ? seen.allClear : true) && stale,
      });
    }
  }
  assert.ok(clears.size > 0, "no exempt pairs found — the walk lost them");
  for (const [label, { exempt, min, allClear }] of clears) {
    assert.ok(
      !allClear,
      `${label} now clears ${min}:1 on all 24 combinations — drop the exemption: ${exempt}`,
    );
  }
});

// A module walk that silently returned nothing would pass vacuously.
test("the module walk yields pairs for every flavor and variant", () => {
  for (const { flavor, variant } of allCombinations()) {
    assert.ok(
      gtkPairsFor(flavor, variant).length >= 15,
      `${flavor} ${variant} yielded too few pairs`,
    );
  }
});

test("the module walk covers both WCAG criteria", () => {
  const rules = new Set(gtkPairsFor("midnight", "blue").map((p) => p.rule));
  assert.deepEqual([...rules].sort(), ["nontext", "text"]);
});
