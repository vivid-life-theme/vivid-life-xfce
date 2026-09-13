import { composite } from "../../lib/contrast.mjs";

export function render(ctx) {
  return `headerbar {
  background-color: @vl_bg_soft;
  color: @vl_fg;
  border-bottom: 1px solid @vl_border;
}

/* A toolbar painted nothing, so it merged into the window and its buttons
   floated on the canvas. Same surface as headerbar — they are the same
   chrome band in different widgets. */
toolbar,
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

/* Path bars and tool buttons are flat until touched: chrome buttons that
   each drew a full border would turn a toolbar into a grid. */
toolbar button,
.toolbar button,
button.flat {
  background-color: transparent;
  border-color: transparent;
}

toolbar button:hover,
.toolbar button:hover,
button.flat:hover {
  background-color: alpha(@vl_accent, 0.2);
  border-color: @vl_control_border;
}

/* A checked flat button must get its fill back. \`button:checked\` (button.mjs)
   and \`button.flat\` (here) are both (0,1,1), and this module is composed
   later — so source order handed a checked flat button transparency while
   leaving \`color: accent_on\` in place: the text meant for an accent fill,
   drawn on whatever surface sits behind. Whisker Menu's active category
   rendered #171717 on #404040 for exactly this reason. Same mechanism as
   entry:disabled needing \`> text\` and GTK2's fg[ACTIVE] on flat toggles —
   a colour chosen for a fill that never arrived. (0,2,1) beats both. */
button.flat:checked {
  background-color: @vl_accent;
  color: @vl_accent_on;
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
