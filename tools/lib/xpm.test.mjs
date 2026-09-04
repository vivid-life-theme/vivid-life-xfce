import { test } from "node:test";
import assert from "node:assert/strict";
import { renderXpm } from "./xpm.mjs";

test("renderXpm emits a 1x1 single-colour file", () => {
  const xpm = renderXpm("left_active", ["a"], { a: "#404040" });
  assert.equal(
    xpm,
    [
      "/* XPM */",
      "static char * left_active_xpm[] = {",
      '"1 1 1 1",',
      '"a\tc #404040",',
      '"a"};',
      "",
    ].join("\n"),
  );
});

test("renderXpm emits the correct header for a multi-colour grid", () => {
  const rows = ["ab", "ab", "cc"];
  const xpm = renderXpm("title_1_active", rows, {
    a: "#0a0a0a",
    b: "#171717",
    c: "#93c5fd",
  });
  assert.match(xpm, /^"2 3 3 1",$/m);
  assert.match(xpm, /^"c\tc #93c5fd",$/m);
  assert.match(xpm, /^"cc"\};$/m);
});

test("renderXpm supports transparent entries", () => {
  const xpm = renderXpm("corner", ["ab"], { a: "None", b: "#404040" });
  assert.match(xpm, /^"a\tc None",$/m);
});

test("renderXpm rejects rows of unequal length", () => {
  assert.throws(
    () => renderXpm("bad", ["aa", "a"], { a: "#000000" }),
    /equal length/,
  );
});

test("renderXpm rejects a row character with no colour entry", () => {
  assert.throws(() => renderXpm("bad", ["az"], { a: "#000000" }), /no colour/);
});
