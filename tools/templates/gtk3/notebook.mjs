export function render(ctx) {
  return `notebook > header {
  background-color: @vl_bg_soft;
  border-color: @vl_border;
}

notebook > header tab {
  color: @vl_fg_muted;
  padding: 6px 12px;
}

notebook > header tab:checked {
  color: @vl_fg;
  border-bottom: 2px solid @vl_accent;
}`;
}

export function contrastPairs(ctx) {
  return [
    {
      label: "notebook tab label",
      fg: ctx.text.fg_muted,
      bg: ctx.surface.bg_soft,
      rule: "text",
    },
  ];
}
