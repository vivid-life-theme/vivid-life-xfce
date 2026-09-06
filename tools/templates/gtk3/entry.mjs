export function render(ctx) {
  return `entry {
  background-color: @vl_bg_sunk;
  color: @vl_fg;
  border: 1px solid @vl_control_border;
  border-radius: 4px;
  padding: 4px 6px;
}

entry:focus {
  border-color: @vl_accent;
}`;
}

export function contrastPairs(ctx) {
  return [
    {
      label: "entry text",
      fg: ctx.text.fg,
      bg: ctx.surface.bg_sunk,
      rule: "text",
    },
  ];
}
