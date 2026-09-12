export function render(ctx) {
  return `/* GTK4 nests the slider inside the trough — \`scale > trough > slider\`,
   not \`scale > slider\`. A rule on the latter matches nothing and the knob
   stays unpainted while the trough looks correct, which reads as a scale
   that simply has no handle. */
scale > trough {
  background-color: @vl_bg_sunk;
  border: 1px solid @vl_control_border;
  border-radius: ${ctx.radius.pill};
  min-height: ${ctx.space["1"]};
  min-width: ${ctx.space["1"]};
}

scale > trough > highlight {
  background-color: @vl_accent;
  border-radius: ${ctx.radius.pill};
}

/* The knob is the control boundary colour rather than the accent: it
   overlaps the accent highlight for most of the scale's travel, and accent
   on accent has no edge at all.

   The fill alone cannot carry the edge, because the knob sits on two
   different backdrops — the sunk trough left of the value, the accent
   highlight right of it — and no single token clears 3:1 against both on
   all 24 combinations (the fill is 1.03:1 against the accent on Dawn Red).
   So the edge is split, which is also what GTK4's own sheet does: the fill
   delineates the knob against the unfilled trough (worst 3.20:1) and the
   border delineates it against the highlight (worst 4.52:1). Both gated
   below. */
scale > trough > slider {
  background-color: @vl_control_border;
  border: 1px solid @vl_bg;
  border-radius: ${ctx.radius.pill};
  min-width: ${ctx.space["4"]};
  min-height: ${ctx.space["4"]};
  margin: -${ctx.space["2"]};
}

/* No hover fill. The knob took @vl_accent on hover, which erased it into the
   highlight it sits on for most of the scale's travel — the exact failure the
   comment above exists to prevent. GTK4's own sheet never accents the knob
   either; it shifts a neutral gradient, which needs a hover shade this design
   system does not define. Rather than invent one, the knob stays legible in
   every state and gains no hover tint. */

scale:disabled > trough > slider {
  background-color: @vl_fg_disabled;
}

scale > marks label {
  color: @vl_fg_muted;
}`;
}

export function contrastPairs(ctx) {
  return [
    {
      label: "scale highlight against its trough",
      fg: ctx.accent,
      bg: ctx.surface.bg_sunk,
      rule: "nontext",
    },
    {
      label: "scale slider on the canvas",
      fg: ctx.control.border,
      bg: ctx.surface.bg,
      rule: "nontext",
    },
    {
      label: "scale slider over its trough",
      fg: ctx.control.border,
      bg: ctx.surface.bg_sunk,
      rule: "nontext",
    },
    {
      // The pair that was missing. The knob sits on the accent highlight for
      // most of the scale's travel, and only the unfilled side was declared —
      // so nothing gated the backdrop the knob is actually on once the value
      // moves off zero.
      label: "scale slider edge over the accent highlight",
      fg: ctx.surface.bg,
      bg: ctx.accent,
      rule: "nontext",
    },
    {
      label: "scale mark label",
      fg: ctx.text.fg_muted,
      bg: ctx.surface.bg,
      rule: "text",
    },
    {
      label: "disabled scale slider",
      fg: ctx.text.fg_disabled,
      bg: ctx.surface.bg_sunk,
      rule: "nontext",
      exempt: "WCAG 1.4.11 — inactive user-interface component",
    },
  ];
}
