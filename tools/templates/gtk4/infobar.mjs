// GtkInfoBar is deprecated in GTK 4.10 but present through 4.x, and apps
// ported from GTK3 still use it. Its structure differs from GTK3 in the way
// that matters most for a theme: GTK4 nests `infobar > revealer > box`, and
// ONLY THE BOX PAINTS. A fill on the `infobar` node — the GTK3 form that
// gtk3/infobar.mjs uses — lands on a node that draws nothing, the same trap
// phase 2 hit with sidebars (`stacksidebar` nests a scrolledwindow and a
// viewport, and only the inner nodes paint). Verified against GTK4's own
// sheet, which writes every infobar fill as `infobar.<kind> > revealer > box`.
//
// The kind → colour mapping mirrors gtk3/infobar.mjs. The bare
// .warning/.error/.success foreground classes are NOT repeated here — on
// GTK4 they live in base.mjs since phase 4.
const KINDS = [
  ["info", "@vl_info"],
  ["warning", "@vl_warning"],
  ["error", "@vl_danger"],
  ["question", "@vl_accent"],
];

export function render(ctx) {
  const fills = KINDS.map(
    ([kind, color]) => `infobar.${kind} > revealer > box {
  background-color: ${color};
}`,
  ).join("\n\n");

  // The descendant form for the label: GTK may set a colour on the message
  // label directly, and a declaration on the element beats inheritance from
  // the box whatever the specificity — the same reason entry:disabled had to
  // name `> text` explicitly.
  const onFill = KINDS.map(
    ([kind]) =>
      `infobar.${kind} > revealer > box,\ninfobar.${kind} > revealer > box label`,
  ).join(",\n");

  return `infobar > revealer > box {
  background-color: @vl_bg_soft;
  color: @vl_fg;
  border-bottom: 1px solid @vl_control_border;
  padding: ${ctx.space["2"]};
}

${fills}

${onFill} {
  color: @vl_accent_on;
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
      label: "infobar message on the neutral bar",
      fg: ctx.text.fg,
      bg: ctx.surface.bg_soft,
      rule: "text",
    },
    {
      label: "infobar boundary",
      fg: ctx.control.border,
      bg: ctx.surface.bg_soft,
      rule: "nontext",
    },
  ];
}
