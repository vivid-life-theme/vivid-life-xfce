export function render(ctx) {
  return `switch {
  background-color: @vl_bg_sunk;
  border: 1px solid @vl_control_border;
  border-radius: ${ctx.radius.pill};
  min-width: 40px;
  min-height: 20px;
}

switch:checked {
  background-color: @vl_accent;
  border-color: @vl_accent;
}

/* The child combinator is what GTK4's own stylesheet uses. The GTK3
   descendant form still matches, but \`switch > slider\` says exactly which
   node is meant and cannot pick up a nested one. */
switch > slider {
  background-color: @vl_fg_muted;
  border-radius: 50%;
  min-width: 16px;
  min-height: 16px;
  margin: 1px;
}

switch:checked > slider {
  background-color: @vl_accent_on;
}

switch:disabled {
  color: @vl_fg_disabled;
}`;
}

export function contrastPairs(ctx) {
  return [
    {
      label: "switch slider on trough",
      fg: ctx.text.fg_muted,
      bg: ctx.surface.bg_sunk,
      rule: "nontext",
    },
    {
      label: "switch slider when checked",
      fg: ctx.accentOn,
      bg: ctx.accent,
      rule: "nontext",
    },
    {
      label: "switch trough boundary",
      fg: ctx.control.border,
      bg: ctx.surface.bg,
      rule: "nontext",
    },
  ];
}
