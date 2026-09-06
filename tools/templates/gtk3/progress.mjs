export function render(ctx) {
  return `progressbar > trough {
  background-color: @vl_bg_sunk;
  border-radius: 4px;
}

progressbar > trough > progress {
  background-color: @vl_accent;
  border-radius: 4px;
}`;
}

export function contrastPairs(ctx) {
  return [
    {
      label: "progress fill against its trough",
      fg: ctx.accent,
      bg: ctx.surface.bg_sunk,
      rule: "nontext",
    },
  ];
}
