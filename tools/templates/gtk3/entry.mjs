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
}

combobox arrow {
  color: @vl_fg_muted;
  min-width: ${ctx.space["4"]};
  min-height: ${ctx.space["4"]};
  -gtk-icon-source: -gtk-icontheme("pan-down-symbolic");
}

combobox button {
  border-radius: ${ctx.radius.sm};
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
    {
      label: "combobox arrow",
      fg: ctx.text.fg_muted,
      bg: ctx.surface.bg_soft,
      rule: "nontext",
    },
  ];
}
