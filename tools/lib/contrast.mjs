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

// GTK's shade(): multiply HSL lightness, clamp to [0,1].
export function shade(hex, factor) {
  const [r255, g255, b255] = parseHex(hex);
  const [r, g, b] = [r255 / 255, g255 / 255, b255 / 255];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  let l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  l = Math.min(1, Math.max(0, l * factor));
  const hue = (p, q, t0) => {
    let t = t0;
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const toByte = (v) =>
    Math.round(v * 255)
      .toString(16)
      .padStart(2, "0");
  if (s === 0) return `#${toByte(l)}${toByte(l)}${toByte(l)}`;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return `#${toByte(hue(p, q, h + 1 / 3))}${toByte(hue(p, q, h))}${toByte(hue(p, q, h - 1 / 3))}`;
}
