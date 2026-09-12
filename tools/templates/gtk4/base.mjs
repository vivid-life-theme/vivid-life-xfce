export function render(ctx) {
  return `* {
  outline-color: alpha(@vl_accent, 0.5);
}

window,
.background {
  background-color: @vl_bg;
  color: @vl_fg;
}

/* The content surface. GTK4 puts a text view's editable area on a \`text\`
   child, so \`textview\` alone paints the wrong node — the GTK3 form
   (\`textview text\`) happens to still match, but the child form is what
   GTK4's own stylesheet uses and is unambiguous. */
.view,
iconview,
textview > text {
  background-color: @vl_bg_sunk;
  color: @vl_fg;
}

/* GTK4 draws a frame's border on the frame node itself. GTK3 needed
   \`frame > border\`; that child node does not exist here, so the GTK3 rule
   would match nothing and frames would draw no edge at all. */
frame,
.frame {
  border: 1px solid @vl_control_border;
  border-radius: ${ctx.radius.sm};
}

/* Decorative rules between sections. border.default rather than the control
   boundary, for the reason phase 2 established: a separator is not a
   user-interface component whose state has to be identifiable, so WCAG
   1.4.11 does not govern it. The exemption is recorded below rather than
   left implicit. */
separator {
  background-color: @vl_border;
  min-width: ${ctx.space.px};
  min-height: ${ctx.space.px};
}

/* The semantic text classes. GTK3 got these in phase 3 (gtk3/infobar.mjs);
   GTK4 defined the tokens and then never consumed them, so warning, error
   and success text all rendered as plain foreground — confirmed by capture,
   where all three labels were the same near-white. Token mapping mirrors
   GTK3's deliberately, including \`.error\` taking the danger token rather
   than an error token of its own, which does not exist.

   Scope: these are the foreground classes only. GTK4 still has GtkInfoBar,
   whose element-level \`.warning\`/\`.error\` fills GTK3 handles in that same
   module, and which this port does not yet cover. */
.warning {
  color: @vl_warning;
}

.error {
  color: @vl_danger;
}

.success {
  color: @vl_success;
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
    {
      label: "warning text",
      fg: ctx.semantic.warning,
      bg: ctx.surface.bg,
      rule: "text",
    },
    {
      label: "error text",
      fg: ctx.semantic.danger,
      bg: ctx.surface.bg,
      rule: "text",
    },
    {
      label: "success text",
      fg: ctx.semantic.success,
      bg: ctx.surface.bg,
      rule: "text",
    },
  ];
}
