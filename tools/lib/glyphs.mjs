import fs from "node:fs";
import { createRequire } from "node:module";

// createRequire rather than import.meta.resolve: the latter only became a
// synchronous, stable API in Node 20.6, and package.json declares >=20.
// The design system's exports map publishes "./assets/*", so the glyph
// SVGs resolve through the package boundary rather than by path guessing.
const require = createRequire(import.meta.url);

export function loadGlyph(name) {
  let filePath;
  try {
    filePath = require.resolve(
      `@vivid-life-theme/design-system/assets/glyphs/${name}.svg`,
    );
  } catch {
    throw new Error(
      `Glyph "${name}" is not in the design system's assets/glyphs/. ` +
        "Add it upstream and bump the pinned version — never vendor it here.",
    );
  }

  const svg = fs.readFileSync(filePath, "utf8");
  const match = svg.match(/<svg[^>]*>([\s\S]*)<\/svg>/);
  if (!match) {
    throw new Error(`Glyph "${name}" is not a well-formed SVG: ${filePath}`);
  }
  return match[1].replace(/\s+/g, " ").trim();
}
