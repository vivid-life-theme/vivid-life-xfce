import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FLAVORS,
  VARIANTS,
  allCombinations,
  flavorBlock,
  resolveAccent,
  accentOn,
} from "./tokens.mjs";

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
