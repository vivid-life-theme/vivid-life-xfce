export function render(ctx) {
  return `/* The control boundary, not border.default: a paned handle is draggable
   and its position is meaningful, which makes it a user-interface component
   under WCAG 1.4.11 rather than the decorative rule base.mjs styles.

   background-image: none is load-bearing. GTK ships a default handle image
   for this node, and it composites over background-color — measured, a
   colour-only rule renders #cdc7c2 where #d4d4d4 was asked for. */
paned > separator {
  background-color: @vl_control_border;
  background-image: none;
  min-width: ${ctx.space.px};
  min-height: ${ctx.space.px};
}

paned > separator:hover {
  background-color: @vl_accent;
  background-image: none;
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
