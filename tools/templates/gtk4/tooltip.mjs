export function render(ctx) {
  return `/* The fill goes on tooltip.background, not on tooltip. GTK4's own
   stylesheet puts only padding and radius on the bare node and the fill on
   the .background form, so a rule on \`tooltip\` alone loses to it on
   specificity and never lands. Both are set here so a tooltip without the
   class is still themed. */
tooltip,
tooltip.background {
  background-color: @vl_bg_overlay;
  color: @vl_fg;
  border: 1px solid @vl_control_border;
  border-radius: ${ctx.radius.md};
}

tooltip > box {
  padding: ${ctx.space["1"]};
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
    {
      label: "tooltip boundary",
      fg: ctx.control.border,
      bg: ctx.surface.bg,
      rule: "nontext",
    },
  ];
}
