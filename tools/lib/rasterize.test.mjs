// tools/lib/rasterize.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { rasterizeSvgToPng, hasRsvgConvert } from "./rasterize.mjs";

const SAMPLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><circle cx="8" cy="8" r="7" fill="#ff0000" /></svg>`;

test("rasterizeSvgToPng writes a non-empty PNG file", (t) => {
  if (!hasRsvgConvert()) {
    t.skip("rsvg-convert not installed on this machine");
    return;
  }
  const outputPath = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), "vlx-")),
    "out.png",
  );
  rasterizeSvgToPng(SAMPLE_SVG, 16, outputPath);
  const stats = fs.statSync(outputPath);
  assert.ok(stats.size > 0);
  const header = fs.readFileSync(outputPath).subarray(0, 8);
  assert.deepEqual([...header.subarray(1, 4)], [0x50, 0x4e, 0x47]); // "PNG"
});

test("rasterizeSvgToPng throws on invalid SVG", (t) => {
  if (!hasRsvgConvert()) {
    t.skip("rsvg-convert not installed on this machine");
    return;
  }
  const outputPath = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), "vlx-")),
    "out.png",
  );
  assert.throws(() => rasterizeSvgToPng("not valid svg", 16, outputPath));
});
