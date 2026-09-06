export function render(ctx) {
  return `tooltip {
  background-color: @vl_bg_overlay;
  color: @vl_fg;
  border: 1px solid @vl_border;
}`;
}

export function contrastPairs(ctx) {
  return [
    {
      label: "tooltip text",
      fg: ctx.text.fg,
      bg: ctx.surface.bg_overlay,
      rule: "text",
    },
  ];
}
