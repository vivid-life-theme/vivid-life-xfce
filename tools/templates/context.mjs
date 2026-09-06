import { controlColors, rawTokens } from "../lib/tokens.mjs";

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
    // Geometry comes from the design system's scales for the same reason
    // colour does: a hardcoded 6px is drift that no gate can catch. Modules
    // written before this existed still carry literal values; they are not
    // retrofitted here, because that would be a visual change unrelated to
    // widget coverage. New rules use these.
    space: rawTokens.spacing,
    radius: rawTokens.radii,
  };
}
