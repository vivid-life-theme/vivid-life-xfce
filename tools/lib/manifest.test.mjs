import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  hashSource,
  renderManifest,
  parseManifest,
  isPng,
  pngDimensions,
} from "./manifest.mjs";
import { rasterizeSvgToPng, hasRsvgConvert } from "./rasterize.mjs";

test("hashSource is a stable lowercase hex SHA-256", () => {
  const hash = hashSource("<svg/>");
  assert.match(hash, /^[0-9a-f]{64}$/);
  assert.equal(hash, hashSource("<svg/>"));
  assert.notEqual(hash, hashSource("<svg />"));
});

test("renderManifest sorts by path and ends with a newline", () => {
  const text = renderManifest([
    { path: "xfwm4/b/close-active.png", hash: "bb" },
    { path: "xfwm4/a/close-active.png", hash: "aa" },
  ]);
  assert.equal(
    text,
    "aa  xfwm4/a/close-active.png\nbb  xfwm4/b/close-active.png\n",
  );
});

test("parseManifest round-trips renderManifest", () => {
  const entries = [
    { path: "xfwm4/a/close-active.png", hash: "aa" },
    { path: "xfwm4/b/close-active.png", hash: "bb" },
  ];
  const parsed = parseManifest(renderManifest(entries));
  assert.equal(parsed.get("xfwm4/a/close-active.png"), "aa");
  assert.equal(parsed.size, 2);
});

test("parseManifest treats missing or empty input as no entries", () => {
  assert.equal(parseManifest("").size, 0);
  assert.equal(parseManifest(undefined).size, 0);
});

test("isPng requires a complete IHDR, not just the signature", () => {
  const signature = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]);
  // A truncated file — an interrupted write, a bad merge — carries the
  // signature but no dimensions. Rejecting it here is what lets checkDrift
  // report it as drift instead of throwing a RangeError out of readUInt32BE.
  assert.equal(isPng(signature), false);
  assert.equal(isPng(Buffer.concat([signature, Buffer.alloc(15)])), false);
  assert.equal(isPng(Buffer.concat([signature, Buffer.alloc(16)])), true);
  assert.equal(isPng(Buffer.from("not a png")), false);
  assert.equal(isPng(Buffer.alloc(0)), false);
});

test("pngDimensions parses width and height from the IHDR chunk", (t) => {
  if (!hasRsvgConvert()) {
    t.skip("rsvg-convert not installed");
    return;
  }
  const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vlx-manifest-"));
  const pngPath = path.join(outputRoot, "sample.png");
  rasterizeSvgToPng(
    '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="32" viewBox="0 0 8 32"><rect width="8" height="32" fill="#000"/></svg>',
    { width: 8, height: 32 },
    pngPath,
  );
  const dimensions = pngDimensions(fs.readFileSync(pngPath));
  assert.deepEqual(dimensions, { width: 8, height: 32 });
});

test("pngDimensions on a buffer that is not a PNG", () => {
  assert.throws(() => pngDimensions(Buffer.from("not a png")));
});
