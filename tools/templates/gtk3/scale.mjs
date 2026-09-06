export function render(ctx) {
  return `/* A scale drew as bare text: GTK paints none of trough, highlight or
   slider by default, so with no rules the widget is an empty allocation
   with only its value label visible. */
scale trough {
  background-color: @vl_bg_sunk;
  border: 1px solid @vl_control_border;
  border-radius: ${ctx.radius.pill};
  min-height: ${ctx.space["1"]};
  min-width: ${ctx.space["1"]};
}

scale highlight {
  background-color: @vl_accent;
  border-radius: ${ctx.radius.pill};
}

/* The knob is the control boundary colour rather than the accent: it
   overlaps the accent highlight for most of the scale's travel, and accent
   on accent has no edge at all. */
scale slider {
  background-color: @vl_control_border;
  border-radius: ${ctx.radius.pill};
  min-width: ${ctx.space["4"]};
  min-height: ${ctx.space["4"]};
  margin: -${ctx.space["2"]};
}

scale slider:hover {
  background-color: @vl_accent;
}

scale:disabled slider {
  background-color: @vl_fg_disabled;
}

scale marks label {
  color: @vl_fg_muted;
}`;
}

export function contrastPairs(ctx) {
  return [
    {
      label: "scale highlight against its trough",
      fg: ctx.accent,
      bg: ctx.surface.bg_sunk,
      rule: "nontext",
    },
    {
      label: "scale slider on the canvas",
      fg: ctx.control.border,
      bg: ctx.surface.bg,
      rule: "nontext",
    },
    {
      label: "scale slider over its trough",
      fg: ctx.control.border,
      bg: ctx.surface.bg_sunk,
      rule: "nontext",
    },
    {
      label: "scale trough boundary",
      fg: ctx.control.border,
      bg: ctx.surface.bg,
      rule: "nontext",
    },
    {
      label: "scale mark label",
      fg: ctx.text.fg_muted,
      bg: ctx.surface.bg,
      rule: "text",
    },
    {
      label: "disabled scale slider",
      fg: ctx.text.fg_disabled,
      bg: ctx.surface.bg_sunk,
      rule: "nontext",
      exempt: "WCAG 1.4.11 — inactive user-interface component",
    },
  ];
}
