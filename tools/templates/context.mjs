import { controlColors } from "../lib/tokens.mjs";

// The single argument bag every template module receives. Modules must not
// reach past this into the raw token set — anything they need belongs here,
// so the contrast gate can see the same values the CSS does.
export function buildContext(flavorBlock, accentHex, accentOnHex) {
  return {
    surface: flavorBlock.surface,
    text: flavorBlock.text,
    border: flavorBlock.border,
    semantic: flavorBlock.semantic,
    state: flavorBlock.state,
    accent: accentHex,
    accentOn: accentOnHex,
    control: controlColors(flavorBlock),
  };
}
