// tools/lib/rasterize.mjs
import { spawnSync } from "node:child_process";

export function hasRsvgConvert() {
  const result = spawnSync("rsvg-convert", ["--version"], { stdio: "ignore" });
  return result.status === 0;
}

export function rasterizeSvgToPng(svgContent, sizePx, outputPath) {
  const result = spawnSync(
    "rsvg-convert",
    [
      "--width",
      String(sizePx),
      "--height",
      String(sizePx),
      "--output",
      outputPath,
    ],
    { input: svgContent, encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error(
      `rsvg-convert failed (exit ${result.status}): ${result.stderr}`,
    );
  }
}
