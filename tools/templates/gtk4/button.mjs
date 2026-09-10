export function render(ctx) {
  return `button {
  background-color: @vl_bg_soft;
  color: @vl_fg;
  /* border.default is identical to bg_soft on Midnight (1.00:1), so the
     derived control boundary is what gives a button an edge at all. */
  border: 1px solid @vl_control_border;
  border-radius: ${ctx.radius.sm};
  padding: ${ctx.space["1"]} ${ctx.space["3"]};
  margin: ${ctx.space.px};
}

button:hover {
  background-color: @vl_border;
}

button:active,
button:checked {
  background-color: @vl_accent;
  color: @vl_accent_on;
}

button:disabled {
  color: @vl_fg_disabled;
}

button.suggested-action {
  background-color: @vl_accent;
  color: @vl_accent_on;
  border-color: @vl_accent;
}

button.destructive-action {
  background-color: @vl_danger;
  color: @vl_accent_on;
  border-color: @vl_danger;
}

/* A linked group is one control drawn as several: square the interior
   corners and collapse the shared edges so three buttons read as a
   segmented control rather than three adjacent controls. */
.linked > button {
  border-radius: 0;
  margin: 0;
}

.linked > button:first-child {
  border-top-left-radius: ${ctx.radius.sm};
  border-bottom-left-radius: ${ctx.radius.sm};
}

.linked > button:last-child {
  border-top-right-radius: ${ctx.radius.sm};
  border-bottom-right-radius: ${ctx.radius.sm};
}

.linked > button + button {
  border-left-width: 0;
}`;
}

export function contrastPairs(ctx) {
  return [
    {
      label: "button label",
      fg: ctx.text.fg,
      bg: ctx.surface.bg_soft,
      rule: "text",
    },
    {
      label: "button boundary",
      fg: ctx.control.border,
      bg: ctx.surface.bg,
      rule: "nontext",
    },
    {
      label: "button hover label",
      fg: ctx.text.fg,
      bg: ctx.border.default,
      rule: "text",
    },
    {
      label: "active button label",
      fg: ctx.accentOn,
      bg: ctx.accent,
      rule: "text",
    },
    {
      label: "suggested button label",
      fg: ctx.accentOn,
      bg: ctx.accent,
      rule: "text",
    },
    {
      label: "destructive button label",
      fg: ctx.accentOn,
      bg: ctx.semantic.danger,
      rule: "text",
    },
    {
      label: "disabled button label",
      fg: ctx.text.fg_disabled,
      bg: ctx.surface.bg_soft,
      rule: "text",
      exempt: "WCAG 1.4.3 — text in an inactive user-interface component",
    },
  ];
}
