export function render() {
  return `button {
  background-color: @vl_bg_soft;
  color: @vl_fg;
  border: 1px solid @vl_border;
  border-radius: 4px;
  padding: 4px 10px;
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
  ];
}
