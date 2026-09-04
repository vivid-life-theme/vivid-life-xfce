import { createHash } from "node:crypto";

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

export function hashSource(svg) {
  return createHash("sha256").update(svg, "utf8").digest("hex");
}

export function renderManifest(entries) {
  return (
    [...entries]
      .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
      .map((entry) => `${entry.hash}  ${entry.path}`)
      .join("\n") + "\n"
  );
}

export function parseManifest(text) {
  const map = new Map();
  if (!text) return map;
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    const separatorIndex = line.indexOf("  ");
    if (separatorIndex === -1) continue;
    const hash = line.slice(0, separatorIndex);
    const filePath = line.slice(separatorIndex + 2);
    map.set(filePath, hash);
  }
  return map;
}

// A complete IHDR is required, not just the signature: every caller means
// "a PNG we can actually use". Accepting a truncated file here would let
// pngDimensions read past the end of the buffer and throw, so checkDrift
// would crash with a stack trace instead of naming the offending file.
const PNG_HEADER_BYTES = 24;

export function isPng(buffer) {
  return (
    buffer.length >= PNG_HEADER_BYTES &&
    buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)
  );
}

// Xfwm4 derives the corner-resize grab region from the asset's raster
// dimensions, so the drift check must be able to see them: width is
// bytes 16..19 of the IHDR chunk, height is bytes 20..23, both
// big-endian uint32 (PNG spec, ISO/IEC 15948 §11.2.2).
export function pngDimensions(buffer) {
  if (!isPng(buffer)) {
    throw new Error("pngDimensions: not a PNG (bad signature)");
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}
