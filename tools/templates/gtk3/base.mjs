export function render(ctx) {
  return `* {
  outline-color: alpha(@vl_accent, 0.5);
}

window,
.background {
  background-color: @vl_bg;
  color: @vl_fg;
}`;
}

export function contrastPairs(ctx) {
  return [
    { label: "window text", fg: ctx.text.fg, bg: ctx.surface.bg, rule: "text" },
  ];
}
