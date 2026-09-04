export function parseHex(hex) {
  const s = hex.replace("#", "");
  if (s.length !== 6 && s.length !== 8) {
    throw new Error(`Not a hex colour: ${hex}`);
  }
  const byte = (i) => parseInt(s.slice(i * 2, i * 2 + 2), 16);
  return [byte(0), byte(1), byte(2), s.length === 8 ? byte(3) : 255];
}

function toHex(rgb) {
  return (
    "#" + rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")
  );
}

export function composite(baseHex, overlayHex) {
  const [br, bg, bb] = parseHex(baseHex);
  const [or, og, ob, oa] = parseHex(overlayHex);
  const a = oa / 255;
  return toHex([
    or * a + br * (1 - a),
    og * a + bg * (1 - a),
    ob * a + bb * (1 - a),
  ]);
}

function channelLuminance(value) {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex) {
  const [r, g, b] = parseHex(hex);
  return (
    0.2126 * channelLuminance(r) +
    0.7152 * channelLuminance(g) +
    0.0722 * channelLuminance(b)
  );
}

export function contrastRatio(a, b) {
  const [lighter, darker] = [relativeLuminance(a), relativeLuminance(b)].sort(
    (x, y) => y - x,
  );
  return (lighter + 0.05) / (darker + 0.05);
}
