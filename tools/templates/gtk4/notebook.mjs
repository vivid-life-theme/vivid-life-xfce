export function render(ctx) {
  return `notebook > header {
  background-color: @vl_bg_soft;
  border-color: @vl_control_border;
}

notebook > header > tabs > tab {
  color: @vl_fg_muted;
  padding: ${ctx.space["1"]} ${ctx.space["3"]};
  border-radius: 0;
}

/* This is the one accent mark in the port that sits on a chrome band, and
   it does not contradict the "no accent mark on bg_soft or bg_overlay"
   constraint — it is legal precisely BECAUSE the same rule repaints the
   checked tab to bg_sunk. The underline is drawn against that sunk
   surface, not against the bg_soft the header carries, and accent on
   bg_sunk clears 3:1 (3.49:1 at worst, noon orange).

   Do not "fix" this back to a plain fill without also removing the
   background-color line: drop the repaint and the underline lands on
   bg_soft at 2.76:1 on Midnight Red, and the constraint is then real. */
notebook > header > tabs > tab:checked {
  background-color: @vl_bg_sunk;
  color: @vl_fg;
  box-shadow: inset 0 -3px @vl_accent;
}

notebook > header > tabs > tab:hover:not(:checked) {
  color: @vl_fg;
}

notebook > stack {
  background-color: @vl_bg_sunk;
}`;
}

export function contrastPairs(ctx) {
  return [
    {
      label: "inactive tab label",
      fg: ctx.text.fg_muted,
      bg: ctx.surface.bg_soft,
      rule: "text",
    },
    {
      label: "active tab label",
      fg: ctx.text.fg,
      bg: ctx.surface.bg_sunk,
      rule: "text",
    },
    {
      label: "active tab underline",
      fg: ctx.accent,
      bg: ctx.surface.bg_sunk,
      rule: "nontext",
    },
  ];
}
