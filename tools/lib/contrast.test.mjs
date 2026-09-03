import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseHex,
  composite,
  relativeLuminance,
  contrastRatio,
} from "./contrast.mjs";

test("parseHex reads #rrggbb with implicit full alpha", () => {
  assert.deepEqual(parseHex("#0a0a0a"), [10, 10, 10, 255]);
});

test("parseHex reads #rrggbbaa", () => {
  assert.deepEqual(parseHex("#ffffff14"), [255, 255, 255, 20]);
});

test("composite flattens the design system's hover overlay onto bg_sunk", () => {
  // Midnight: state.hover #ffffff14 (alpha 20/255) over surface.bg_sunk #0a0a0a
  assert.equal(composite("#0a0a0a", "#ffffff14"), "#1d1d1d");
});

test("composite is a no-op for a fully opaque overlay", () => {
  assert.equal(composite("#0a0a0a", "#ff0000"), "#ff0000");
});

test("relativeLuminance matches the WCAG reference endpoints", () => {
  assert.equal(relativeLuminance("#000000"), 0);
  assert.equal(relativeLuminance("#ffffff"), 1);
});

test("contrastRatio is symmetric and matches a known pair", () => {
  const forward = contrastRatio("#ffffff", "#000000");
  assert.equal(forward, 21);
  assert.equal(contrastRatio("#000000", "#ffffff"), forward);
});

test("contrastRatio reproduces the audited fg-on-bg_sunk value for Midnight", () => {
  // text.fg #f5f5f5 on surface.bg_sunk #0a0a0a
  assert.equal(contrastRatio("#f5f5f5", "#0a0a0a").toFixed(2), "18.16");
});
