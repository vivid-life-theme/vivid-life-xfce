// tools/lib/paths.mjs
import path from "node:path";

export const TARGETS = ["gtk-2.0", "gtk-3.0", "gtk-4.0", "xfwm4"];

export function themeDirName(flavor, variant) {
  return `vivid-life-${flavor}-${variant}`;
}

export function targetOutputDir(outputRoot, target, flavor, variant) {
  return path.join(outputRoot, target, themeDirName(flavor, variant));
}
