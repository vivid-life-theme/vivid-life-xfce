import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FLAVORS,
  VARIANTS,
  allCombinations,
  flavorBlock,
  resolveAccent,
  accentOn,
  controlColors,
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

test("resolveAccent matches the documented dawn/red shade (900)", () => {
  // accent_shade.dawn.red === 900 per tokens.json
  assert.equal(resolveAccent("dawn", "red"), "#7f1d1d");
});

test("accentOn is dark text for dark flavors, light text for light flavors", () => {
  assert.equal(accentOn("midnight"), "#171717");
  assert.equal(accentOn("twilight"), "#171717");
  assert.equal(accentOn("dawn"), "#f5f5f5");
  assert.equal(accentOn("noon"), "#f5f5f5");
});

test("controlColors picks the first candidate clearing 3:1 on every control surface", () => {
  // Expected per flavor, computed from the pinned token set:
  //   midnight  border.strong/#737373 and fg_subtle/#737373 both fail on
  //             bg_soft (2.19:1), so fg_muted wins.
  //   twilight  border.strong/#0a0a0a fails on bg (1.91:1); fg_subtle clears.
  //   dawn/noon border.strong clears everywhere.
  const expected = {
    midnight: { border: "#d4d4d4", source: "text.fg_muted" },
    twilight: { border: "#a3a3a3", source: "text.fg_subtle" },
    dawn: { border: "#404040", source: "border.strong" },
    noon: { border: "#737373", source: "border.strong" },
  };
  for (const [flavor, want] of Object.entries(expected)) {
    assert.deepEqual(controlColors(flavor), want, `flavor ${flavor}`);
  }
});

test("the derived control border clears 3:1 on bg, bg_soft and bg_overlay", () => {
  for (const flavor of ["midnight", "twilight", "dawn", "noon"]) {
    const b = flavorBlock(flavor);
    const { border } = controlColors(flavor);
    for (const surface of ["bg", "bg_soft", "bg_overlay"]) {
      const ratio = contrastRatio(border, b.surface[surface]);
      assert.ok(
        ratio >= 3,
        `${flavor} ${surface}: ${border} on ${b.surface[surface]} is ${ratio.toFixed(2)}:1`,
      );
    }
  }
});

test("controlColors accepts a flavor block as well as a flavor name", () => {
  assert.deepEqual(controlColors(flavorBlock("noon")), controlColors("noon"));
});
