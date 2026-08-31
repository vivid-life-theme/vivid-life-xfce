import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { renderAll } from "./generate.mjs";
import { hasRsvgConvert } from "./lib/rasterize.mjs";

const GENERATE_SCRIPT = fileURLToPath(
  new URL("./generate.mjs", import.meta.url),
);

test("renderAll writes all 24 directories for gtk-2.0, gtk-3.0, gtk-4.0, xfwm4", () => {
  const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vlx-generate-"));
  const result = renderAll(outputRoot);

  for (const target of ["gtk-2.0", "gtk-3.0", "gtk-4.0", "xfwm4"]) {
    const dirs = fs.readdirSync(path.join(outputRoot, target));
    assert.equal(
      dirs.length,
      24,
      `expected 24 dirs under ${target}, got ${dirs.length}`,
    );
  }
  assert.equal(result.dirsWritten, 96);
});

test("renderAll writes non-empty gtkrc, gtk.css, and themerc files", () => {
  const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vlx-generate-"));
  renderAll(outputRoot);

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

test("renderAll writes button PNGs when rsvg-convert is available", (t) => {
  if (!hasRsvgConvert()) {
    t.skip("rsvg-convert not installed on this machine");
    return;
  }
  const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vlx-generate-"));
  renderAll(outputRoot);

  const themeDir = path.join(outputRoot, "xfwm4", "vivid-life-midnight-purple");
  for (const kind of ["close", "hide", "maximize"]) {
    for (const state of ["active", "inactive"]) {
      const pngPath = path.join(themeDir, `${kind}-${state}.png`);
      assert.ok(
        fs.statSync(pngPath).size > 0,
        `expected ${pngPath} to exist and be non-empty`,
      );
    }
  }
});
