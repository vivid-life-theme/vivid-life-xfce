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
import {
  OUTPUT_DIRS,
  INDEX_DIR,
  targetOutputDir,
  themeDirName,
} from "./lib/paths.mjs";
import { renderGtk3Css } from "./templates/gtk3.mjs";
import { renderGtk2Gtkrc } from "./templates/gtk2.mjs";
import { renderGtk4Css } from "./templates/gtk4.mjs";
import { renderIndexTheme } from "./templates/index-theme.mjs";
import {
  renderThemerc,
  TITLE_SEGMENTS,
  EDGES,
  renderTitleXpm,
  renderEdgeXpm,
  renderTopCornerSvg,
  renderBottomCornerSvg,
  buttonMatrix,
  renderButtonSvg,
} from "./templates/xfwm4.mjs";
import { loadGlyph } from "./lib/glyphs.mjs";
import {
  hashSource,
  renderManifest,
  parseManifest,
  isPng,
  pngDimensions,
} from "./lib/manifest.mjs";
import { rasterizeSvgToPng, hasRsvgConvert } from "./lib/rasterize.mjs";

const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url));
const MANIFEST_PATH = path.join("xfwm4", "assets.manifest");
// listFilesRecursive builds posix-separated relative paths, so the skip
// there compares against this rather than MANIFEST_PATH.
const MANIFEST_REL = path.posix.join("xfwm4", "assets.manifest");

const BUTTON_SIZE = { width: 24, height: 32 };
const TOP_CORNER_SIZE = { width: 8, height: 32 };
const BOTTOM_CORNER_SIZE = { width: 16, height: 16 };

export function renderAll(outputRoot, options = {}) {
  const force = options.force === true;
  if (!hasRsvgConvert()) {
    throw new Error(
      "rsvg-convert is required to generate the full theme output (see README). " +
        "Install librsvg2-bin (Debian/Ubuntu) or the equivalent for your distro.",
    );
  }

  const previous = parseManifest(
    fs.existsSync(path.join(outputRoot, MANIFEST_PATH))
      ? fs.readFileSync(path.join(outputRoot, MANIFEST_PATH), "utf8")
      : "",
  );
  const manifestEntries = [];
  let dirsWritten = 0;
  let filesWritten = 0;

  // Glyph markup is identical across combinations; read each one once.
  const glyphCache = new Map();
  const glyphFor = (name) => {
    if (!glyphCache.has(name)) glyphCache.set(name, loadGlyph(name));
    return glyphCache.get(name);
  };

  // 1,056 manifest entries share only 748 distinct SVG sources (title
  // segments repeat byte-for-byte per flavor/variant/state, bottom corners
  // don't vary with focus). Rasterising each source once per run and
  // copying the bytes for repeats cuts rsvg-convert invocations by ~29%
  // without touching what previous/force decide is up to date.
  const rasterCache = new Map();

  function writePng(svg, size, themeDir, fileName, relDir) {
    const relPath = path.posix.join(relDir, fileName);
    const outPath = path.join(themeDir, fileName);
    const hash = hashSource(svg);
    manifestEntries.push({ path: relPath, hash });

    const upToDate =
      !force &&
      previous.get(relPath) === hash &&
      fs.existsSync(outPath) &&
      isPng(fs.readFileSync(outPath));
    if (!upToDate) {
      const cachedPath = rasterCache.get(hash);
      if (cachedPath) {
        fs.copyFileSync(cachedPath, outPath);
      } else {
        rasterizeSvgToPng(svg, size, outPath);
        rasterCache.set(hash, outPath);
      }
    }
    filesWritten += 1;
  }

  for (const { flavor, variant } of allCombinations()) {
    const block = flavorBlock(flavor);
    const accentHex = resolveAccent(flavor, variant);
    const accentOnHex = accentOn(flavor);

    for (const [target, render] of [
      [
        "gtk-2.0",
        () => ["gtkrc", renderGtk2Gtkrc(block, accentHex, accentOnHex)],
      ],
      [
        "gtk-3.0",
        () => ["gtk.css", renderGtk3Css(block, accentHex, accentOnHex)],
      ],
      [
        "gtk-4.0",
        () => ["gtk.css", renderGtk4Css(block, accentHex, accentOnHex)],
      ],
      [
        INDEX_DIR,
        () => ["index.theme", renderIndexTheme(flavor, variant, block)],
      ],
    ]) {
      const dir = targetOutputDir(outputRoot, target, flavor, variant);
      fs.mkdirSync(dir, { recursive: true });
      const [fileName, contents] = render();
      fs.writeFileSync(path.join(dir, fileName), contents);
      dirsWritten += 1;
      filesWritten += 1;
    }

    const xfwm4Dir = targetOutputDir(outputRoot, "xfwm4", flavor, variant);
    const relDir = path.posix.join("xfwm4", themeDirName(flavor, variant));
    fs.mkdirSync(xfwm4Dir, { recursive: true });

    fs.writeFileSync(
      path.join(xfwm4Dir, "themerc"),
      renderThemerc(block, accentHex, accentOnHex),
    );
    filesWritten += 1;

    for (const active of [true, false]) {
      const suffix = active ? "active" : "inactive";

      for (const segment of TITLE_SEGMENTS) {
        fs.writeFileSync(
          path.join(xfwm4Dir, `title-${segment}-${suffix}.xpm`),
          renderTitleXpm({ flavorBlock: block, accentHex, active, segment }),
        );
        filesWritten += 1;
      }

      for (const edge of EDGES) {
        fs.writeFileSync(
          path.join(xfwm4Dir, `${edge}-${suffix}.xpm`),
          renderEdgeXpm({ flavorBlock: block, edge, active }),
        );
        filesWritten += 1;
      }

      for (const side of ["left", "right"]) {
        writePng(
          renderTopCornerSvg({ flavorBlock: block, accentHex, side, active }),
          TOP_CORNER_SIZE,
          xfwm4Dir,
          `top-${side}-${suffix}.png`,
          relDir,
        );
        writePng(
          renderBottomCornerSvg({ flavorBlock: block, side }),
          BOTTOM_CORNER_SIZE,
          xfwm4Dir,
          `bottom-${side}-${suffix}.png`,
          relDir,
        );
      }
    }

    for (const entry of buttonMatrix()) {
      writePng(
        renderButtonSvg({
          flavorBlock: block,
          accentHex,
          glyphMarkup: glyphFor(entry.glyph),
          state: entry.state,
        }),
        BUTTON_SIZE,
        xfwm4Dir,
        `${entry.name}.png`,
        relDir,
      );
    }

    dirsWritten += 1;
  }

  fs.writeFileSync(
    path.join(outputRoot, MANIFEST_PATH),
    renderManifest(manifestEntries),
  );
  filesWritten += 1;

  return { dirsWritten, filesWritten };
}

function listFilesRecursive(root) {
  const results = [];
  for (const target of OUTPUT_DIRS) {
    const targetPath = path.join(root, target);
    if (!fs.existsSync(targetPath)) continue;
    for (const entry of fs.readdirSync(targetPath)) {
      const themePath = path.join(targetPath, entry);
      // Skip assets.manifest by NAME, not by type: it sits beside the theme
      // directories and is byte-compared separately below. Skipping every
      // non-directory instead would let any other stray file at this level
      // — an editor backup, a merge leftover — escape the drift check and
      // ship to everyone who clones the repo.
      if (path.posix.join(target, entry) === MANIFEST_REL) continue;
      if (!fs.statSync(themePath).isDirectory()) {
        results.push(path.posix.join(target, entry));
        continue;
      }
      for (const file of fs.readdirSync(themePath)) {
        results.push(path.posix.join(target, entry, file));
      }
    }
  }
  return results;
}

const isPngPath = (relPath) => relPath.endsWith(".png");

export function checkDrift(repoRoot) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vlx-check-"));
  try {
    renderAll(tempRoot);

    const drift = [];
    const freshFiles = new Set(listFilesRecursive(tempRoot));
    const committedFiles = new Set(listFilesRecursive(repoRoot));

    for (const relPath of freshFiles) {
      const committedPath = path.join(repoRoot, relPath);
      if (!fs.existsSync(committedPath)) {
        drift.push(relPath);
        continue;
      }
      if (isPngPath(relPath)) {
        // PNG bytes are build output; the manifest is the hash-level gate.
        // Dimensions still matter directly: Xfwm4 derives the corner-resize
        // grab region from a corner asset's raster size, so a PNG at the
        // wrong dimensions must be reported even though its bytes are never
        // compared. The freshly-rendered PNG at this path is the authority
        // for what size it should be.
        const committedBuffer = fs.readFileSync(committedPath);
        if (!isPng(committedBuffer)) {
          drift.push(relPath);
          continue;
        }
        const freshBuffer = fs.readFileSync(path.join(tempRoot, relPath));
        const committedSize = pngDimensions(committedBuffer);
        const freshSize = pngDimensions(freshBuffer);
        if (
          committedSize.width !== freshSize.width ||
          committedSize.height !== freshSize.height
        ) {
          drift.push(relPath);
        }
        continue;
      }
      const fresh = fs.readFileSync(path.join(tempRoot, relPath));
      if (!fresh.equals(fs.readFileSync(committedPath))) drift.push(relPath);
    }

    for (const relPath of committedFiles) {
      if (!freshFiles.has(relPath)) {
        drift.push(relPath);
      }
    }

    const freshManifest = fs.readFileSync(path.join(tempRoot, MANIFEST_PATH));
    const committedManifestPath = path.join(repoRoot, MANIFEST_PATH);
    if (
      !fs.existsSync(committedManifestPath) ||
      !freshManifest.equals(fs.readFileSync(committedManifestPath))
    ) {
      drift.push(MANIFEST_PATH);
    }

    return drift;
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function main() {
  const checkMode = process.argv.includes("--check");
  const force = process.argv.includes("--force-raster");

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

  const { dirsWritten, filesWritten } = renderAll(REPO_ROOT, { force });
  console.log(
    `Wrote ${filesWritten} files across ${dirsWritten} theme directories.`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
