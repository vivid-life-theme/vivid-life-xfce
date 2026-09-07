// These are foregrounds with no background of their own, so they inherit
// whichever surface the ancestor painted. All four are asserted.
const SURFACES = ["bg", "bg_sunk", "bg_soft", "bg_overlay"];

// GTK puts .info/.warning/.error/.question on the infobar element itself,
// which is why the bare foreground classes below tinted an infobar's text
// while leaving GTK's default grey behind it. The element form fills the
// bar; the descendant form is needed because GTK sets a colour on the
// message label directly, which plain inheritance would not override.
const KINDS = [
  ["info", "@vl_info"],
  ["warning", "@vl_warning"],
  ["error", "@vl_danger"],
  ["question", "@vl_accent"],
];

export function render(ctx) {
  const fills = KINDS.map(
    ([kind, color]) => `infobar.${kind} {
  background-color: ${color};
}`,
  ).join("\n\n");

  const onFill = KINDS.map(
    ([kind]) => `infobar.${kind},\ninfobar.${kind} label`,
  ).join(",\n");

  return `infobar {
  background-color: @vl_bg_soft;
  color: @vl_fg;
  border: 1px solid @vl_control_border;
  border-radius: ${ctx.radius.sm};
  padding: ${ctx.space["2"]};
}

${fills}

${onFill} {
  color: @vl_accent_on;
}

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
  const kinds = [
    ["info", ctx.semantic.info],
    ["warning", ctx.semantic.warning],
    ["error", ctx.semantic.danger],
    ["question", ctx.accent],
  ];
  return [
    ...kinds.map(([kind, fill]) => ({
      label: `infobar ${kind} message`,
      fg: ctx.accentOn,
      bg: fill,
      rule: "text",
    })),
    {
      label: "infobar boundary",
      fg: ctx.control.border,
      bg: ctx.surface.bg,
      rule: "nontext",
    },
    ...SURFACES.flatMap((surface) => [
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
    ]),
  ];
}
