import { test } from "node:test";
import assert from "node:assert/strict";
import { renderGtk2Gtkrc } from "./gtk2.mjs";
import { flavorBlock, resolveAccent, accentOn } from "../lib/tokens.mjs";

test("renderGtk2Gtkrc embeds surface and accent colors", () => {
  const noon = flavorBlock("noon");
  const gtkrc = renderGtk2Gtkrc(
    noon,
    resolveAccent("noon", "red"),
    accentOn("noon"),
  );
  assert.match(gtkrc, /bg\[NORMAL\]\s+= "#f5f5f5"/);
  assert.match(gtkrc, /bg\[SELECTED\]\s+= "#b91c1c"/);
  assert.match(gtkrc, /fg\[SELECTED\]\s+= "#f5f5f5"/);
});

test("renderGtk2Gtkrc declares the default widget class binding", () => {
  const noon = flavorBlock("noon");
  const gtkrc = renderGtk2Gtkrc(
    noon,
    resolveAccent("noon", "red"),
    accentOn("noon"),
  );
  assert.match(gtkrc, /class "GtkWidget" style "vivid-life-default"/);
  assert.match(gtkrc, /class "GtkButton" style "vivid-life-button"/);
  assert.match(gtkrc, /class "GtkEntry" style "vivid-life-entry"/);
});
