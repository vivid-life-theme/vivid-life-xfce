import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FLAVORS,
  VARIANTS,
  allCombinations,
  flavorBlock,
  resolveAccent,
  accentOn,
  rawTokens,
} from "./tokens.mjs";
import { contrastRatio } from "./contrast.mjs";

test("FLAVORS is in time order", () => {
  assert.deepEqual(FLAVORS, ["midnight", "twilight", "dawn", "noon"]);
});

test("VARIANTS excludes cyan", () => {
  assert.deepEqual(VARIANTS, [
    "red",
    "orange",
    "yellow",
    "green",
    "blue",
    "purple",
  ]);
});

test("allCombinations returns all 24 pairs", () => {
  const combos = allCombinations();
  assert.equal(combos.length, 24);
  assert.deepEqual(combos[0], { flavor: "midnight", variant: "red" });
  assert.deepEqual(combos.at(-1), { flavor: "noon", variant: "purple" });
});

test("flavorBlock returns the flavor object", () => {
  const midnight = flavorBlock("midnight");
  assert.equal(midnight.label, "Midnight");
  assert.equal(midnight.type, "dark");
  assert.ok(midnight.surface.bg);
});

test("flavorBlock throws on unknown flavor", () => {
  assert.throws(() => flavorBlock("nope"), /Unknown flavor/);
});

test("resolveAccent matches the documented midnight/purple shade (300)", () => {
  // accent_shade.midnight.purple === 300 per tokens.json
  assert.equal(resolveAccent("midnight", "purple"), "#d8b4fe");
});

test("resolveAccent matches the documented dawn/red shade (800)", () => {
  // accent_shade.dawn.red === 800 per tokens.json
  assert.equal(resolveAccent("dawn", "red"), "#991b1b");
});

test("accentOn is dark text for dark flavors, light text for light flavors", () => {
  assert.equal(accentOn("midnight"), "#171717");
  assert.equal(accentOn("twilight"), "#171717");
  assert.equal(accentOn("dawn"), "#f5f5f5");
  assert.equal(accentOn("noon"), "#f5f5f5");
});

test("border.control clears the design system's 3:1 on every control_boundary surface", () => {
  const { min, surfaces } = rawTokens.control_boundary;
  for (const flavor of FLAVORS) {
    const b = flavorBlock(flavor);
    for (const surface of surfaces) {
      const ratio = contrastRatio(b.border.control, b.surface[surface]);
      assert.ok(
        ratio >= min,
        `${flavor} ${surface}: ${b.border.control} on ${b.surface[surface]} is ${ratio.toFixed(2)}:1`,
      );
    }
  }
});
