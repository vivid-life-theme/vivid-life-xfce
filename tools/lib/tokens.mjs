import designSystem from "@vivid-life-theme/design-system";

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

export const rawTokens = tokens;
