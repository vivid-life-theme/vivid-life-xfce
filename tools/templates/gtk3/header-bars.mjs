export function render(ctx) {
  return `headerbar {
  background-color: @vl_bg_soft;
  color: @vl_fg;
  border-bottom: 1px solid @vl_border;
}`;
}

export function contrastPairs(ctx) {
  return [
    {
      label: "headerbar title",
      fg: ctx.text.fg,
      bg: ctx.surface.bg_soft,
      rule: "text",
    },
  ];
}
