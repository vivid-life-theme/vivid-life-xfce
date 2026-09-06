export function render(ctx) {
  return `.warning {
  color: @vl_warning;
}

.error {
  color: @vl_danger;
}

.success {
  color: @vl_success;
}`;
}

// These are foregrounds with no background of their own, so they inherit
// whichever surface the ancestor painted. All four are asserted.
const SURFACES = ["bg", "bg_sunk", "bg_soft", "bg_overlay"];

export function contrastPairs(ctx) {
  return SURFACES.flatMap((surface) => [
    {
      label: `warning text on ${surface}`,
      fg: ctx.semantic.warning,
      bg: ctx.surface[surface],
      rule: "text",
    },
    {
      label: `error text on ${surface}`,
      fg: ctx.semantic.danger,
      bg: ctx.surface[surface],
      rule: "text",
    },
    {
      label: `success text on ${surface}`,
      fg: ctx.semantic.success,
      bg: ctx.surface[surface],
      rule: "text",
    },
  ]);
}
