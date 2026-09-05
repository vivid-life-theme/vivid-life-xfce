import designSystem from "@vivid-life-theme/design-system";
import { contrastRatio } from "./contrast.mjs";

const tokens = designSystem.default ?? designSystem;

export const FLAVORS = ["midnight", "twilight", "dawn", "noon"];
export const VARIANTS = ["red", "orange", "yellow", "green", "blue", "purple"];

export function allCombinations() {
  const combos = [];
  for (const flavor of FLAVORS) {
    for (const variant of VARIANTS) {
      combos.push({ flavor, variant });
    }
  }
  return combos;
}

export function flavorBlock(flavor) {
  const block = tokens.flavors[flavor];
  if (!block) {
    throw new Error(`Unknown flavor: ${flavor}`);
  }
  return block;
}

export function resolveAccent(flavor, variant) {
  const shade = tokens.accent_shade[flavor][variant];
  return tokens.palette[variant][String(shade)];
}

export function accentOn(flavor) {
  const { type } = flavorBlock(flavor);
  return type === "dark"
    ? tokens.palette.gray["900"]
    : tokens.palette.gray["100"];
}

// Surfaces a themed control can sit on or be filled with. A border only
// reads as a boundary if it separates from both the canvas behind the
// control and the control's own fill, so every one of these must clear.
const CONTROL_SURFACES = ["bg", "bg_soft", "bg_overlay"];
const NONTEXT_MIN = 3;

// The design system has no token whose contrast against a control surface
// is gated, and none of the border tokens clear WCAG 1.4.11 (3:1) on every
// flavor — border.default is literally identical to surface.bg_soft on
// Midnight (1.00:1). Upstream issue:
// https://github.com/vivid-life-theme/vivid-life-design-system/issues/15
// Until that lands, pick the first existing token that clears 3:1 against
// every control surface. Deterministic, invents no hex, and collapses to a
// direct token read once upstream ships one.
export function controlColors(flavorOrBlock) {
  const block =
    typeof flavorOrBlock === "string"
      ? flavorBlock(flavorOrBlock)
      : flavorOrBlock;
  const candidates = [
    ["border.strong", block.border.strong],
    ["text.fg_subtle", block.text.fg_subtle],
    ["text.fg_muted", block.text.fg_muted],
  ];
  for (const [source, border] of candidates) {
    const clearsAll = CONTROL_SURFACES.every(
      (surface) => contrastRatio(border, block.surface[surface]) >= NONTEXT_MIN,
    );
    if (clearsAll) return { border, source };
  }
  throw new Error(
    `No border candidate clears ${NONTEXT_MIN}:1 against ${CONTROL_SURFACES.join(", ")}`,
  );
}

export const rawTokens = tokens;
