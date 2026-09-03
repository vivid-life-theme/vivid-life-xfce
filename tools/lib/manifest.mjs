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

export function isPng(buffer) {
  return (
    buffer.length >= PNG_SIGNATURE.length &&
    buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)
  );
}
