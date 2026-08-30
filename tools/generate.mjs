import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import {
  allCombinations,
  flavorBlock,
  resolveAccent,
  accentOn,
} from "./lib/tokens.mjs";
import { TARGETS, targetOutputDir } from "./lib/paths.mjs";
import { renderGtk3Css } from "./templates/gtk3.mjs";
import { renderGtk2Gtkrc } from "./templates/gtk2.mjs";
import { renderGtk4Css } from "./templates/gtk4.mjs";
import {
  renderThemerc,
  BUTTON_KINDS,
  renderButtonSvg,
} from "./templates/xfwm4.mjs";
import { rasterizeSvgToPng, hasRsvgConvert } from "./lib/rasterize.mjs";

const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url));
const BUTTON_SIZE_PX = 16;

export function renderAll(outputRoot) {
  let dirsWritten = 0;
  let filesWritten = 0;
  const canRasterize = hasRsvgConvert();

  for (const { flavor, variant } of allCombinations()) {
    const block = flavorBlock(flavor);
    const accentHex = resolveAccent(flavor, variant);
    const accentOnHex = accentOn(flavor);

    const gtk2Dir = targetOutputDir(outputRoot, "gtk-2.0", flavor, variant);
    fs.mkdirSync(gtk2Dir, { recursive: true });
    fs.writeFileSync(
      path.join(gtk2Dir, "gtkrc"),
      renderGtk2Gtkrc(block, accentHex, accentOnHex),
    );
    dirsWritten += 1;
    filesWritten += 1;

    const gtk3Dir = targetOutputDir(outputRoot, "gtk-3.0", flavor, variant);
    fs.mkdirSync(gtk3Dir, { recursive: true });
    fs.writeFileSync(
      path.join(gtk3Dir, "gtk.css"),
      renderGtk3Css(block, accentHex, accentOnHex),
    );
    dirsWritten += 1;
    filesWritten += 1;

    const gtk4Dir = targetOutputDir(outputRoot, "gtk-4.0", flavor, variant);
    fs.mkdirSync(gtk4Dir, { recursive: true });
    fs.writeFileSync(
      path.join(gtk4Dir, "gtk.css"),
      renderGtk4Css(block, accentHex, accentOnHex),
    );
    dirsWritten += 1;
    filesWritten += 1;

    const xfwm4Dir = targetOutputDir(outputRoot, "xfwm4", flavor, variant);
    fs.mkdirSync(xfwm4Dir, { recursive: true });
    fs.writeFileSync(
      path.join(xfwm4Dir, "themerc"),
      renderThemerc(block, accentHex, accentOnHex),
    );
    filesWritten += 1;
    if (canRasterize) {
      for (const kind of BUTTON_KINDS) {
        for (const active of [true, false]) {
          const svg = renderButtonSvg({
            kind,
            active,
            backgroundHex: block.surface.bg_soft,
            glyphHex: active ? block.text.fg : block.text.fg_subtle,
          });
          const state = active ? "active" : "inactive";
          const pngPath = path.join(xfwm4Dir, `${kind}-${state}.png`);
          rasterizeSvgToPng(svg, BUTTON_SIZE_PX, pngPath);
          filesWritten += 1;
        }
      }
    }
    dirsWritten += 1;
  }

  return { dirsWritten, filesWritten };
}

function listFilesRecursive(root) {
  const results = [];
  for (const target of TARGETS) {
    const targetPath = path.join(root, target);
    if (!fs.existsSync(targetPath)) continue;
    for (const themeDir of fs.readdirSync(targetPath)) {
      const themePath = path.join(targetPath, themeDir);
      for (const file of fs.readdirSync(themePath)) {
        results.push(path.join(target, themeDir, file));
      }
    }
  }
  return results;
}

export function checkDrift(repoRoot) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vlx-check-"));
  renderAll(tempRoot);

  const drift = [];
  const freshFiles = new Set(listFilesRecursive(tempRoot));
  const committedFiles = new Set(listFilesRecursive(repoRoot));

  for (const relPath of freshFiles) {
    const freshContent = fs.readFileSync(path.join(tempRoot, relPath));
    const committedPath = path.join(repoRoot, relPath);
    if (
      !fs.existsSync(committedPath) ||
      !freshContent.equals(fs.readFileSync(committedPath))
    ) {
      drift.push(relPath);
    }
  }
  for (const relPath of committedFiles) {
    if (!freshFiles.has(relPath)) {
      drift.push(relPath);
    }
  }

  fs.rmSync(tempRoot, { recursive: true, force: true });
  return drift;
}

function main() {
  const checkMode = process.argv.includes("--check");

  if (checkMode) {
    const drift = checkDrift(REPO_ROOT);
    if (drift.length > 0) {
      console.error(
        `Generated output is stale (${drift.length} file(s) differ):`,
      );
      for (const file of drift) console.error(`  ${file}`);
      process.exitCode = 1;
      return;
    }
    console.log("Generated output matches tokens — no drift.");
    return;
  }

  const { dirsWritten, filesWritten } = renderAll(REPO_ROOT);
  console.log(
    `Wrote ${filesWritten} files across ${dirsWritten} theme directories.`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
