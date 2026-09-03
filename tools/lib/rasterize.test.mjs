// tools/lib/rasterize.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { rasterizeSvgToPng, hasRsvgConvert } from "./rasterize.mjs";

test("rasterizeSvgToPng honours non-square dimensions", (t) => {
  if (!hasRsvgConvert()) {
    t.skip("rsvg-convert not installed");
    return;
  }
  const outputPath = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), "vlx-raster-")),
    "out.png",
  );
  rasterizeSvgToPng(
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="32" viewBox="0 0 24 32"><rect width="24" height="32" fill="#000"/></svg>',
    { width: 24, height: 32 },
    outputPath,
  );
  const header = fs.readFileSync(outputPath);
  assert.deepEqual([...header.subarray(1, 4)], [0x50, 0x4e, 0x47]);
  // IHDR width and height are big-endian uint32 at bytes 16 and 20.
  assert.equal(header.readUInt32BE(16), 24);
  assert.equal(header.readUInt32BE(20), 32);
});

test("rasterizeSvgToPng throws on invalid SVG", (t) => {
  if (!hasRsvgConvert()) {
    t.skip("rsvg-convert not installed");
    return;
  }
  const outputPath = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), "vlx-raster-")),
    "out.png",
  );
  assert.throws(() =>
    rasterizeSvgToPng("not valid svg", { width: 16, height: 16 }, outputPath),
  );
});
