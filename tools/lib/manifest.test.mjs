import { test } from "node:test";
import assert from "node:assert/strict";
import {
  hashSource,
  renderManifest,
  parseManifest,
  isPng,
} from "./manifest.mjs";

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

test("isPng recognises the signature and rejects anything else", () => {
  const signature = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]);
  assert.equal(isPng(signature), true);
  assert.equal(isPng(Buffer.from("not a png")), false);
  assert.equal(isPng(Buffer.alloc(0)), false);
});
