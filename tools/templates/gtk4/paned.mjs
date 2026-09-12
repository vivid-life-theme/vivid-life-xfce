export function render(ctx) {
  return `/* The control boundary, not border.default: a paned handle is draggable
   and its position is meaningful, which makes it a user-interface component
   under WCAG 1.4.11 rather than the decorative rule base.mjs styles.
   background-image: none is required, not optional — GTK4's default sets a
   handle image on this node, and an image composites over a colour, so a
   colour-only rule renders GTK4's grey instead of the token asked for. */
paned > separator {
  background-image: none;
  background-color: @vl_control_border;
  min-width: ${ctx.space.px};
  min-height: ${ctx.space.px};
}

paned > separator:hover {
  background-image: none;
  background-color: @vl_accent;
}`;
}

export function contrastPairs(ctx) {
  return [
    {
      label: "paned handle on the canvas",
      fg: ctx.control.border,
      bg: ctx.surface.bg,
      rule: "nontext",
    },
    {
      label: "paned handle against a content pane",
      fg: ctx.control.border,
      bg: ctx.surface.bg_sunk,
      rule: "nontext",
    },
    {
      label: "paned handle hover",
      fg: ctx.accent,
      bg: ctx.surface.bg,
      rule: "nontext",
    },
  ];
}
