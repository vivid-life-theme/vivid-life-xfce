import { test } from "node:test";
import assert from "node:assert/strict";
import { renderIndexTheme } from "./index-theme.mjs";
import { flavorBlock } from "../lib/tokens.mjs";

test("renderIndexTheme names the theme in title case", () => {
  const out = renderIndexTheme("midnight", "blue", flavorBlock("midnight"));
  assert.match(out, /^Name=Vivid Life Midnight Blue$/m);
  assert.match(out, /^Type=X-GNOME-Metatheme$/m);
});

test("renderIndexTheme points Gtk and Metacity at the theme directory name", () => {
  const out = renderIndexTheme("dawn", "purple", flavorBlock("dawn"));
  assert.match(out, /^GtkTheme=vivid-life-dawn-purple$/m);
  assert.match(out, /^MetacityTheme=vivid-life-dawn-purple$/m);
});

test("renderIndexTheme recommends the Papirus variant matching the flavor type", () => {
  assert.match(
    renderIndexTheme("midnight", "red", flavorBlock("midnight")),
    /^IconTheme=Papirus-Dark$/m,
  );
  assert.match(
    renderIndexTheme("noon", "red", flavorBlock("noon")),
    /^IconTheme=Papirus-Light$/m,
  );
});
