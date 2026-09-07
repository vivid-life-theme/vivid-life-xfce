export function render(ctx) {
  return `/* GTK3 draws a spin button as an entry with two button children. Styling
   the outer node and neutralising the children keeps it reading as one
   field rather than a text box wedged between two buttons. */
spinbutton {
  background-color: @vl_bg_sunk;
  color: @vl_fg;
  border: 1px solid @vl_control_border;
  border-radius: ${ctx.radius.sm};
}

spinbutton entry {
  background-color: transparent;
  border: none;
  padding: ${ctx.space["1"]} ${ctx.space["2"]};
}

spinbutton button {
  background-color: transparent;
  border: none;
  border-radius: 0;
  color: @vl_fg_muted;
  padding: 0 ${ctx.space["2"]};
}

spinbutton button:hover {
  background-color: alpha(@vl_accent, 0.2);
  color: @vl_fg;
}

spinbutton button:disabled {
  color: @vl_fg_disabled;
}`;
}

export function contrastPairs(ctx) {
  return [
    {
      label: "spinbutton value",
      fg: ctx.text.fg,
      bg: ctx.surface.bg_sunk,
      rule: "text",
    },
    {
      label: "spinbutton +/- glyph",
      fg: ctx.text.fg_muted,
      bg: ctx.surface.bg_sunk,
      rule: "text",
    },
    {
      label: "spinbutton boundary",
      fg: ctx.control.border,
      bg: ctx.surface.bg,
      rule: "nontext",
    },
    {
      label: "disabled spinbutton glyph",
      fg: ctx.text.fg_disabled,
      bg: ctx.surface.bg_sunk,
      rule: "text",
      exempt: "WCAG 1.4.3 — text in an inactive user-interface component",
    },
  ];
}
