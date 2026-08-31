// tools/lib/paths.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { TARGETS, themeDirName, targetOutputDir } from "./paths.mjs";

test("TARGETS lists all four ports", () => {
  assert.deepEqual(TARGETS, ["gtk-2.0", "gtk-3.0", "gtk-4.0", "xfwm4"]);
});

test("themeDirName joins flavor and variant", () => {
  assert.equal(
    themeDirName("midnight", "purple"),
    "vivid-life-midnight-purple",
  );
});

test("targetOutputDir builds the full path", () => {
  const result = targetOutputDir("/tmp/out", "gtk-3.0", "dawn", "blue");
  assert.equal(
    result,
    path.join("/tmp/out", "gtk-3.0", "vivid-life-dawn-blue"),
  );
});
