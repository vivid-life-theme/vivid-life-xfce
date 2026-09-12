export function render(ctx) {
  return `switch {
  background-color: @vl_bg_sunk;
  border: 1px solid @vl_control_border;
  border-radius: ${ctx.radius.pill};
  min-width: 40px;
  min-height: 20px;
}

switch:checked {
  background-color: @vl_accent;
  border-color: @vl_accent;
}

/* The child combinator is what GTK4's own stylesheet uses. The GTK3
   descendant form still matches, but \`switch > slider\` says exactly which
   node is meant and cannot pick up a nested one. */
switch > slider {
  background-color: @vl_fg_muted;
  border-radius: 50%;
  min-width: 16px;
  min-height: 16px;
  margin: 1px;
}

switch:checked > slider {
  background-color: @vl_accent_on;
}

/* The trough and the knob are both painted with background-color, so a
   disabled rule setting \`color\` alone changes nothing a switch draws — it
   rendered identically to an enabled one, in either state. Repaint both, the
   way scale.mjs does for its disabled slider. The checked forms need naming
   explicitly: \`switch:checked\` is (0,2,0) and would otherwise outrank a bare
   \`switch:disabled\` on the same element. */
switch:disabled,
switch:checked:disabled {
  background-color: @vl_bg_sunk;
  border-color: @vl_fg_disabled;
}

switch:disabled > slider,
switch:checked:disabled > slider {
  background-color: @vl_fg_disabled;
}`;
}

export function contrastPairs(ctx) {
  return [
    {
      label: "switch slider on trough",
      fg: ctx.text.fg_muted,
      bg: ctx.surface.bg_sunk,
      rule: "nontext",
    },
    {
      // Sibling modules declare their disabled state; this one did not, which
      // is why nothing caught that the disabled rule painted no pixels.
      label: "disabled switch slider",
      fg: ctx.text.fg_disabled,
      bg: ctx.surface.bg_sunk,
      rule: "nontext",
      exempt: "WCAG 1.4.11 — inactive user-interface component",
    },
    {
      label: "switch slider when checked",
      fg: ctx.accentOn,
      bg: ctx.accent,
      rule: "nontext",
    },
    {
      label: "switch trough boundary",
      fg: ctx.control.border,
      bg: ctx.surface.bg,
      rule: "nontext",
    },
  ];
}
