import { test } from "node:test";
import assert from "node:assert/strict";
import { buildContext } from "./context.mjs";
import { flavorBlock, resolveAccent, accentOn } from "../lib/tokens.mjs";

test("buildContext exposes the token groups and the derived control colors", () => {
  const ctx = buildContext(
    flavorBlock("midnight"),
    resolveAccent("midnight", "blue"),
    accentOn("midnight"),
  );
  assert.equal(ctx.surface.bg, "#171717");
  assert.equal(ctx.text.fg, "#f5f5f5");
  assert.equal(ctx.border.default, "#404040");
  assert.equal(ctx.accent, "#93c5fd");
  assert.equal(ctx.accentOn, "#171717");
  assert.equal(ctx.control.border, "#d4d4d4");
});
