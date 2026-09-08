import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { contrastRatio, composite } from "./lib/contrast.mjs";
import {
  allCombinations,
  flavorBlock,
  resolveAccent,
  accentOn,
} from "./lib/tokens.mjs";
import { buildContext } from "./templates/context.mjs";
import { GTK3_MODULES } from "./templates/gtk3.mjs";
import { GTK4_MODULES } from "./templates/gtk4.mjs";
import { GTK2_MODULES } from "./templates/gtk2.mjs";
import * as GTK3_TOKENS from "./templates/gtk3/_tokens.mjs";
import * as GTK4_TOKENS from "./templates/gtk4/_tokens.mjs";
import * as GTK2_TOKENS from "./templates/gtk2/_tokens.mjs";

const AA = 4.5;
// WCAG 1.4.3 governs text; non-text UI components (scrollbar sliders, focus
// indicators, control borders) fall under 1.4.11 at a lower 3:1 floor. Each
// pair declares which criterion it is measured against via `rule`, so the two
// never get conflated in one assertion.
const AA_NONTEXT = 3;

const REGISTRIES = {
  gtk3: GTK3_MODULES,
  gtk4: GTK4_MODULES,
  gtk2: GTK2_MODULES,
};

// The _tokens.mjs module of each registry declares @define-color/gtk-color-
// scheme names, not widget rules, so it has no contrastPairs export and is
// the one legitimate exception below. Matched by namespace-object identity
// (import * as ... is a singleton per module URL) rather than by counting or
// a hardcoded index, since module order and count both change across tasks.
const TOKENS_BY_TARGET = {
  gtk3: GTK3_TOKENS,
  gtk4: GTK4_TOKENS,
  gtk2: GTK2_TOKENS,
};

// Directories backing each registry, for resolving a failing module back to
// its file name in assertion messages.
const DIR_BY_TARGET = {
  gtk3: fileURLToPath(new URL("./templates/gtk3/", import.meta.url)),
  gtk4: fileURLToPath(new URL("./templates/gtk4/", import.meta.url)),
  gtk2: fileURLToPath(new URL("./templates/gtk2/", import.meta.url)),
};

// Resolves a module namespace object back to the file that defines it, by
// matching `render` function identity against every file in its registry's
// directory — the same technique gtk2/gtk3/gtk4's own test files already use
// to tie a composed module back to its source file.
async function fileNameFor(dir, module) {
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".mjs") && !f.endsWith(".test.mjs"));
  for (const f of files) {
    if ((await import(path.join(dir, f))).render === module.render) return f;
  }
  return "(unknown module)";
}

function contextFor(flavor, variant) {
  return buildContext(
    flavorBlock(flavor),
    resolveAccent(flavor, variant),
    accentOn(flavor),
  );
}

// Every template module declares the pairs it emits next to the CSS that
// emits them, and this walk collects them across all three targets — so a
// new widget module cannot ship colours the gate has never seen.
//
// Labels are prefixed with their target. gtk3/base.mjs and gtk4/base.mjs
// both emit a pair called "window text"; without the prefix the exemption
// map below would collapse two targets' claims into one key and stop
// noticing when only one of them goes stale.
function modulePairsFor(flavor, variant) {
  const ctx = contextFor(flavor, variant);
  return Object.entries(REGISTRIES).flatMap(([target, modules]) =>
    modules.flatMap((m) =>
      m.contrastPairs
        ? m
            .contrastPairs(ctx)
            .map((p) => ({ ...p, label: `${target}: ${p.label}` }))
        : [],
    ),
  );
}

function registryPairCounts(flavor, variant) {
  const ctx = contextFor(flavor, variant);
  return Object.fromEntries(
    Object.entries(REGISTRIES).map(([target, modules]) => [
      target,
      modules.flatMap((m) => (m.contrastPairs ? m.contrastPairs(ctx) : []))
        .length,
    ]),
  );
}

// xfwm4.mjs is not split into modules, so its pairs stay an explicit list.
function otherPairsFor(flavor) {
  const b = flavorBlock(flavor);
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
  ];
}

for (const { flavor, variant } of allCombinations()) {
  test(`WCAG — ${flavor} ${variant}`, () => {
    for (const pair of [
      ...modulePairsFor(flavor, variant),
      ...otherPairsFor(flavor),
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
    for (const pair of modulePairsFor(flavor, variant)) {
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
      modulePairsFor(flavor, variant).length >= 25,
      `${flavor} ${variant} yielded too few pairs`,
    );
  }
});

test("the module walk covers both WCAG criteria", () => {
  const rules = new Set(modulePairsFor("midnight", "blue").map((p) => p.rule));
  assert.deepEqual([...rules].sort(), ["nontext", "text"]);
});

// A registry that lost its contrastPairs — or a target whose modules were
// never wired into the walk — would make this file pass vacuously for that
// target while it shipped ungated colours.
test("every target registry contributes pairs", () => {
  const counts = registryPairCounts("midnight", "blue");
  assert.ok(counts.gtk3 >= 15, `gtk3 yielded ${counts.gtk3} pairs`);
  assert.ok(counts.gtk4 >= 5, `gtk4 yielded ${counts.gtk4} pairs`);
  assert.ok(counts.gtk2 >= 3, `gtk2 yielded ${counts.gtk2} pairs`);
});

// Count floors above catch a registry emptying out, but the realistic
// regression is smaller than that: one module's contrastPairs export gets
// renamed or broken and the registry total barely moves, since it is one
// module's pairs missing out of dozens. This asserts per module instead, so
// a widget module going dark fails the gate by name instead of shipping its
// colours ungated. One combination is enough — which modules declare pairs
// is structural, not combination-dependent.
test("every widget module declares contrast pairs", async () => {
  const ctx = contextFor("midnight", "blue");
  for (const [target, modules] of Object.entries(REGISTRIES)) {
    const tokensModule = TOKENS_BY_TARGET[target];
    const dir = DIR_BY_TARGET[target];
    for (const m of modules) {
      if (m === tokensModule) continue; // _tokens.mjs declares no pairs
      const name = await fileNameFor(dir, m);
      assert.equal(
        typeof m.contrastPairs,
        "function",
        `${target}/${name} does not export contrastPairs`,
      );
      assert.ok(
        m.contrastPairs(ctx).length > 0,
        `${target}/${name} contrastPairs() returned no pairs`,
      );
    }
  }
});
