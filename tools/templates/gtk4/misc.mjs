export function render(ctx) {
  return `calendar {
  background-color: @vl_bg_sunk;
  color: @vl_fg;
  border: 1px solid @vl_control_border;
  border-radius: ${ctx.radius.sm};
}

calendar > header {
  border-bottom: 1px solid @vl_control_border;
}

calendar > grid > label {
  padding: ${ctx.space["1"]};
}

calendar > grid > label.other-month,
calendar > grid > label.day-name {
  color: @vl_fg_muted;
}

calendar > grid > label:selected {
  background-color: @vl_accent;
  color: @vl_accent_on;
  border-radius: ${ctx.radius.sm};
}

/* GTK4 renamed the widget node to expander-widget and gave the arrow the
   name \`expander\` — exactly inverted from GTK3, where the widget is
   \`expander\` and the arrow is \`arrow\`. Using the GTK3 form here tints the
   arrow and loses the widget rule entirely. */
expander-widget title {
  color: @vl_fg;
  padding: ${ctx.space["1"]} 0;
}

expander-widget expander {
  -gtk-icon-source: -gtk-icontheme("pan-end-symbolic");
  color: @vl_fg_muted;
  min-width: 16px;
  min-height: 16px;
}

expander-widget expander:checked {
  -gtk-icon-source: -gtk-icontheme("pan-down-symbolic");
}

expander-widget title:hover expander {
  color: @vl_accent;
}`;
}

export function contrastPairs(ctx) {
  return [
    {
      label: "calendar day",
      fg: ctx.text.fg,
      bg: ctx.surface.bg_sunk,
      rule: "text",
    },
    {
      label: "calendar secondary day",
      fg: ctx.text.fg_muted,
      bg: ctx.surface.bg_sunk,
      rule: "text",
    },
    {
      label: "calendar selected day",
      fg: ctx.accentOn,
      bg: ctx.accent,
      rule: "text",
    },
    {
      label: "calendar boundary",
      fg: ctx.control.border,
      bg: ctx.surface.bg,
      rule: "nontext",
    },
    {
      label: "expander title",
      fg: ctx.text.fg,
      bg: ctx.surface.bg,
      rule: "text",
    },
    {
      label: "expander arrow",
      fg: ctx.text.fg_muted,
      bg: ctx.surface.bg,
      rule: "nontext",
    },
    {
      label: "expander arrow hover",
      fg: ctx.accent,
      bg: ctx.surface.bg,
      rule: "nontext",
    },
  ];
}
