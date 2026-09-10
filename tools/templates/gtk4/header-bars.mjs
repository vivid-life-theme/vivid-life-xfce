import { composite } from "../../lib/contrast.mjs";

export function render(ctx) {
  return `headerbar {
  background-color: @vl_bg_soft;
  color: @vl_fg;
  border-bottom: 1px solid @vl_border;
}

/* GtkToolbar was removed in GTK4. What remains is the .toolbar style class
   apps put on a plain box — there is no \`toolbar\` element to match, which
   is why the GTK3 rule cannot simply be copied across. */
.toolbar {
  background-color: @vl_bg_soft;
  color: @vl_fg;
  padding: ${ctx.space["1"]};
  border-bottom: 1px solid @vl_control_border;
}

actionbar > revealer > box {
  background-color: @vl_bg_soft;
  color: @vl_fg;
  padding: ${ctx.space["2"]};
  border-top: 1px solid @vl_control_border;
}

/* Chrome buttons are flat until touched: each drawing a full border would
   turn a toolbar into a grid. */
.toolbar button,
button.flat {
  background-color: transparent;
  border-color: transparent;
}

.toolbar button:hover,
button.flat:hover {
  background-color: alpha(@vl_accent, 0.2);
  border-color: @vl_control_border;
}`;
}

export function contrastPairs(ctx) {
  return [
    {
      label: "headerbar title",
      fg: ctx.text.fg,
      bg: ctx.surface.bg_soft,
      rule: "text",
    },
    {
      label: "toolbar label",
      fg: ctx.text.fg,
      bg: ctx.surface.bg_soft,
      rule: "text",
    },
    {
      label: "toolbar boundary",
      fg: ctx.control.border,
      bg: ctx.surface.bg_soft,
      rule: "nontext",
    },
    {
      label: "flat button hover label",
      fg: ctx.text.fg,
      bg: composite(ctx.surface.bg_soft, `${ctx.accent}33`),
      rule: "text",
    },
  ];
}
