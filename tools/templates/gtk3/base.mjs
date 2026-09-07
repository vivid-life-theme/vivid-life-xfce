export function render(ctx) {
  return `* {
  outline-color: alpha(@vl_accent, 0.5);
}

window,
.background {
  background-color: @vl_bg;
  color: @vl_fg;
}

/* The content surface: text views, tree views and anything else that holds
   a document rather than chrome. Matches entry, which sits on the same
   sunk surface, so a text field and the view it filters read as one layer. */
.view,
textview,
textview text {
  background-color: @vl_bg_sunk;
  color: @vl_fg;
}

/* GTK draws a frame's border on a dedicated \`border\` child node, so the
   element selector alone paints nothing — this is why frames rendered with
   no visible edge at all. .frame is the class form apps apply directly. */
frame > border,
.frame {
  border: 1px solid @vl_control_border;
  border-radius: ${ctx.radius.sm};
}

/* Decorative rules between sections. Deliberately border.default, not the
   control boundary: a separator is not a user-interface component whose
   state has to be identifiable, so WCAG 1.4.11 does not govern it, and the
   control boundary reads as a hard divider where a hairline is wanted.
   The exemption is recorded in contrastPairs rather than left implicit. */
separator {
  background-color: @vl_border;
  min-width: ${ctx.space.px};
  min-height: ${ctx.space.px};
}`;
}

export function contrastPairs(ctx) {
  return [
    { label: "window text", fg: ctx.text.fg, bg: ctx.surface.bg, rule: "text" },
    {
      label: "view text",
      fg: ctx.text.fg,
      bg: ctx.surface.bg_sunk,
      rule: "text",
    },
    {
      label: "frame boundary",
      fg: ctx.control.border,
      bg: ctx.surface.bg,
      rule: "nontext",
    },
    {
      label: "decorative separator",
      fg: ctx.border.default,
      bg: ctx.surface.bg,
      rule: "nontext",
      exempt:
        "WCAG 1.4.11 — decorative separator, not a UI component whose state must be identifiable",
    },
  ];
}
