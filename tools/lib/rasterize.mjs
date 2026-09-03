// tools/lib/rasterize.mjs
import { spawnSync } from "node:child_process";

export function hasRsvgConvert() {
  const result = spawnSync("rsvg-convert", ["--version"], { stdio: "ignore" });
  return result.status === 0;
}

export function rasterizeSvgToPng(svgContent, size, outputPath) {
  const result = spawnSync(
    "rsvg-convert",
    [
      "--width",
      String(size.width),
      "--height",
      String(size.height),
      "--output",
      outputPath,
    ],
    { input: svgContent, encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error(
      `rasterizeSvgToPng failed (exit ${result.status}): ${result.stderr}`,
    );
  }
}
