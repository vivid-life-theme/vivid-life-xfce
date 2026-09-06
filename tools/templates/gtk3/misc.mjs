export function render(ctx) {
  return `calendar {
  background-color: @vl_bg_sunk;
  color: @vl_fg;
  border: 1px solid @vl_control_border;
  border-radius: ${ctx.radius.sm};
  padding: ${ctx.space["1"]};
}

/* Days outside the displayed month, and the weekday header row. Muted on
   the sunk surface clears 5.52:1, so these stay legible while reading as
   secondary. */
calendar:indeterminate,
calendar.header,
calendar.highlight {
  color: @vl_fg_muted;
}

calendar:selected {
  background-color: @vl_accent;
  color: @vl_accent_on;
  border-radius: ${ctx.radius.sm};
}

expander title {
  color: @vl_fg;
  padding: ${ctx.space["1"]} 0;
}

/* -gtk-icon-source is load-bearing. A GTK theme replaces Adwaita entirely
   rather than extending it, and Adwaita is what supplies the arrow glyph
   for this node — measured, a colour-only rule leaves the expander with an
   indent and no arrow at all. GTK ships the pan-* symbolic icons in its own
   gresource, so naming them adds no icon dependency. */
expander arrow {
  color: @vl_fg_muted;
  min-width: ${ctx.space["4"]};
  min-height: ${ctx.space["4"]};
  -gtk-icon-source: -gtk-icontheme("pan-end-symbolic");
}

expander arrow:checked {
  -gtk-icon-source: -gtk-icontheme("pan-down-symbolic");
}

expander title:hover arrow {
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
