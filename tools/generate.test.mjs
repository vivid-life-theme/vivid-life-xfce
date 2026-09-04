import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { renderAll, checkDrift } from "./generate.mjs";
import { hasRsvgConvert, rasterizeSvgToPng } from "./lib/rasterize.mjs";
import { buttonMatrix } from "./templates/xfwm4.mjs";
import { pngDimensions } from "./lib/manifest.mjs";

const GENERATE_SCRIPT = fileURLToPath(
  new URL("./generate.mjs", import.meta.url),
);

// Five of the tests below only ever inspect a generated tree — they never
// write into it. Building that tree once and sharing it collapses five
// renderAll passes (each ~1,056 rsvg-convert spawns) into one. This is safe
// ONLY because those five tests are read-only: every test after this block
// that needs to mutate a file must build its own outputRoot with
// fs.mkdtempSync, the way the mutating tests further down already do.
let sharedRoot = null;
let sharedResult = null;
function getSharedTree() {
  if (!sharedRoot) {
    sharedRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vlx-shared-"));
    sharedResult = renderAll(sharedRoot);
  }
  return sharedRoot;
}

test("renderAll writes all 24 directories for gtk-2.0, gtk-3.0, gtk-4.0, xfwm4", (t) => {
  if (!hasRsvgConvert()) {
    t.skip("rsvg-convert not installed");
    return;
  }
  const outputRoot = getSharedTree();
  const result = sharedResult;

  for (const target of ["gtk-2.0", "gtk-3.0", "gtk-4.0", "xfwm4"]) {
    const targetPath = path.join(outputRoot, target);
    // xfwm4/assets.manifest sits beside the 24 theme directories.
    const dirs = fs
      .readdirSync(targetPath)
      .filter((entry) =>
        fs.statSync(path.join(targetPath, entry)).isDirectory(),
      );
    assert.equal(
      dirs.length,
      24,
      `expected 24 dirs under ${target}, got ${dirs.length}`,
    );
  }
  // gtk-2.0, gtk-3.0, gtk-4.0, index and xfwm4 each write one theme
  // directory per combination.
  assert.equal(result.dirsWritten, 120);
});

test("renderAll writes non-empty gtkrc, gtk.css, and themerc files", (t) => {
  if (!hasRsvgConvert()) {
    t.skip("rsvg-convert not installed");
    return;
  }
  const outputRoot = getSharedTree();

  const gtkrc = fs.readFileSync(
    path.join(outputRoot, "gtk-2.0", "vivid-life-midnight-purple", "gtkrc"),
    "utf8",
  );
  assert.ok(gtkrc.length > 0);

  const gtk3css = fs.readFileSync(
    path.join(outputRoot, "gtk-3.0", "vivid-life-noon-blue", "gtk.css"),
    "utf8",
  );
  assert.match(gtk3css, /@define-color vl_accent/);

  const themerc = fs.readFileSync(
    path.join(outputRoot, "xfwm4", "vivid-life-dawn-green", "themerc"),
    "utf8",
  );
  assert.match(themerc, /^active_text_color=/m);
});

test("generate.mjs fails loudly when rsvg-convert is unavailable", (t) => {
  // Build a PATH with every directory containing an rsvg-convert binary removed,
  // so hasRsvgConvert() reports false without needing to mock the module.
  const emptyBinDir = fs.mkdtempSync(path.join(os.tmpdir(), "vlx-no-rsvg-"));
  t.after(() => fs.rmSync(emptyBinDir, { recursive: true, force: true }));

  const strippedPath = (process.env.PATH ?? "")
    .split(path.delimiter)
    .filter((dir) => {
      try {
        return !fs.existsSync(path.join(dir, "rsvg-convert"));
      } catch {
        return true;
      }
    })
    .concat(emptyBinDir)
    .join(path.delimiter);

  const result = spawnSync(process.execPath, [GENERATE_SCRIPT], {
    encoding: "utf8",
    env: { ...process.env, PATH: strippedPath },
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /rsvg-convert is required/);
});

test("renderAll writes all 60 Xfwm4 assets plus themerc", (t) => {
  if (!hasRsvgConvert()) {
    t.skip("rsvg-convert not installed");
    return;
  }
  const outputRoot = getSharedTree();
  const themeDir = path.join(outputRoot, "xfwm4", "vivid-life-midnight-purple");
  const files = fs.readdirSync(themeDir);
  // 60 assets + themerc
  assert.equal(files.length, 61);
  assert.equal(files.filter((f) => f.endsWith(".xpm")).length, 16);
  assert.equal(files.filter((f) => f.endsWith(".png")).length, 44);
  assert.ok(files.includes("themerc"));
  for (const entry of buttonMatrix()) {
    assert.ok(files.includes(`${entry.name}.png`), entry.name);
  }
  for (const name of [
    "title-1-active.xpm",
    "title-5-inactive.xpm",
    "left-active.xpm",
    "bottom-inactive.xpm",
    "top-left-active.png",
    "bottom-right-inactive.png",
  ]) {
    assert.ok(files.includes(name), name);
  }
});

test("renderAll writes an index.theme per combination", (t) => {
  if (!hasRsvgConvert()) {
    t.skip("rsvg-convert not installed");
    return;
  }
  const outputRoot = getSharedTree();
  const indexPath = path.join(
    outputRoot,
    "index",
    "vivid-life-dawn-green",
    "index.theme",
  );
  assert.match(
    fs.readFileSync(indexPath, "utf8"),
    /^GtkTheme=vivid-life-dawn-green$/m,
  );
});

test("renderAll writes a manifest covering every PNG", (t) => {
  if (!hasRsvgConvert()) {
    t.skip("rsvg-convert not installed");
    return;
  }
  const outputRoot = getSharedTree();
  const manifest = fs.readFileSync(
    path.join(outputRoot, "xfwm4", "assets.manifest"),
    "utf8",
  );
  const lines = manifest.trim().split("\n");
  assert.equal(lines.length, 44 * 24);
  assert.match(lines[0], /^[0-9a-f]{64} {2}xfwm4\/vivid-life-/);
  // Sorted by path.
  const paths = lines.map((l) => l.split("  ")[1]);
  assert.deepEqual(paths, [...paths].sort());
});

test("a second renderAll does not rewrite unchanged PNGs", (t) => {
  if (!hasRsvgConvert()) {
    t.skip("rsvg-convert not installed");
    return;
  }
  const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vlx-gen-"));
  renderAll(outputRoot);
  const pngPath = path.join(
    outputRoot,
    "xfwm4",
    "vivid-life-midnight-purple",
    "close-active.png",
  );
  fs.writeFileSync(pngPath, fs.readFileSync(pngPath)); // touch, same bytes
  const touched = fs.statSync(pngPath).mtimeMs;
  renderAll(outputRoot);
  assert.equal(fs.statSync(pngPath).mtimeMs, touched);
});

test("force re-rasterises even when the source hash is unchanged", (t) => {
  if (!hasRsvgConvert()) {
    t.skip("rsvg-convert not installed");
    return;
  }
  const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vlx-gen-"));
  renderAll(outputRoot);
  const pngPath = path.join(
    outputRoot,
    "xfwm4",
    "vivid-life-midnight-purple",
    "close-active.png",
  );
  // A valid PNG at the wrong size: isPng passes and the source hash is
  // unchanged, so this is the one state where force actually decides.
  rasterizeSvgToPng(
    '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1" viewBox="0 0 1 1"><rect width="1" height="1" fill="#000"/></svg>',
    { width: 1, height: 1 },
    pngPath,
  );
  renderAll(outputRoot);
  assert.deepEqual(pngDimensions(fs.readFileSync(pngPath)), {
    width: 1,
    height: 1,
  });
  renderAll(outputRoot, { force: true });
  assert.deepEqual(pngDimensions(fs.readFileSync(pngPath)), {
    width: 24,
    height: 32,
  });
});

test("renderAll repairs a PNG that is missing or not a PNG", (t) => {
  if (!hasRsvgConvert()) {
    t.skip("rsvg-convert not installed");
    return;
  }
  const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vlx-gen-"));
  renderAll(outputRoot);
  const pngPath = path.join(
    outputRoot,
    "xfwm4",
    "vivid-life-noon-red",
    "hide-pressed.png",
  );
  fs.rmSync(pngPath);
  renderAll(outputRoot);
  assert.ok(fs.existsSync(pngPath));
});

test("checkDrift reports a changed text asset", (t) => {
  if (!hasRsvgConvert()) {
    t.skip("rsvg-convert not installed");
    return;
  }
  const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vlx-gen-"));
  renderAll(outputRoot);
  assert.deepEqual(checkDrift(outputRoot), []);
  const themercPath = path.join(
    outputRoot,
    "xfwm4",
    "vivid-life-noon-blue",
    "themerc",
  );
  fs.writeFileSync(themercPath, "tampered\n");
  assert.ok(
    checkDrift(outputRoot).includes("xfwm4/vivid-life-noon-blue/themerc"),
  );
});

test("checkDrift reports a stray file beside the theme directories", (t) => {
  if (!hasRsvgConvert()) {
    t.skip("rsvg-convert not installed");
    return;
  }
  const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vlx-gen-"));
  renderAll(outputRoot);
  assert.deepEqual(checkDrift(outputRoot), []);
  // A merge leftover or editor backup at the same level as assets.manifest.
  // Only assets.manifest itself may live here; anything else is stale output
  // that would otherwise ship to everyone who clones the repo.
  fs.writeFileSync(path.join(outputRoot, "xfwm4", "README.orig"), "stray\n");
  assert.ok(checkDrift(outputRoot).includes("xfwm4/README.orig"));
});

test("checkDrift reports a PNG truncated below a full IHDR", (t) => {
  if (!hasRsvgConvert()) {
    t.skip("rsvg-convert not installed");
    return;
  }
  const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vlx-gen-"));
  renderAll(outputRoot);
  const pngPath = path.join(
    outputRoot,
    "xfwm4",
    "vivid-life-noon-green",
    "menu-active.png",
  );
  // Signature only: enough to look like a PNG, too short to hold dimensions.
  fs.writeFileSync(
    pngPath,
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  );
  assert.ok(
    checkDrift(outputRoot).includes(
      "xfwm4/vivid-life-noon-green/menu-active.png",
    ),
  );
});

test("checkDrift ignores PNG bytes but catches a corrupt PNG", (t) => {
  if (!hasRsvgConvert()) {
    t.skip("rsvg-convert not installed");
    return;
  }
  const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vlx-gen-"));
  renderAll(outputRoot);
  const pngPath = path.join(
    outputRoot,
    "xfwm4",
    "vivid-life-dawn-blue",
    "menu-active.png",
  );
  const original = fs.readFileSync(pngPath);
  // Re-encoded PNG with different bytes but the same source: not drift.
  fs.writeFileSync(pngPath, Buffer.concat([original, Buffer.from([0])]));
  assert.deepEqual(checkDrift(outputRoot), []);
  // A file that is no longer a PNG: drift.
  fs.writeFileSync(pngPath, Buffer.from("not a png"));
  assert.ok(
    checkDrift(outputRoot).includes(
      "xfwm4/vivid-life-dawn-blue/menu-active.png",
    ),
  );
});

// RULING F8(c): the bottom corners are 16x16 specifically so Xfwm4 derives
// a usable corner-resize grab region from the asset's dimensions. A valid
// PNG at the wrong size must be caught as drift even though it passes the
// signature check the plan otherwise relies on.
test("checkDrift catches a valid PNG with the wrong dimensions", (t) => {
  if (!hasRsvgConvert()) {
    t.skip("rsvg-convert not installed");
    return;
  }
  const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vlx-gen-"));
  renderAll(outputRoot);
  assert.deepEqual(checkDrift(outputRoot), []);
  const pngPath = path.join(
    outputRoot,
    "xfwm4",
    "vivid-life-midnight-blue",
    "bottom-left-active.png",
  );
  rasterizeSvgToPng(
    '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1" viewBox="0 0 1 1"><rect width="1" height="1" fill="#000"/></svg>',
    { width: 1, height: 1 },
    pngPath,
  );
  assert.ok(
    checkDrift(outputRoot).includes(
      "xfwm4/vivid-life-midnight-blue/bottom-left-active.png",
    ),
  );
});
