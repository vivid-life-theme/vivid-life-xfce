export function render(ctx) {
  return `# A widget match, not a class one: GTK 2.12 replaced GtkTooltips with a
# GtkWindow named gtk-tooltip, so there is no class to bind.
style "vivid-life-tooltip" {
  bg[NORMAL] = "${ctx.surface.bg_overlay}"
  fg[NORMAL] = "${ctx.text.fg}"

  xthickness = 4
  ythickness = 4
}

widget "gtk-tooltip*" style "vivid-life-tooltip"`;
}

export function contrastPairs(ctx) {
  return [
    {
      label: "tooltip text",
      fg: ctx.text.fg,
      bg: ctx.surface.bg_overlay,
      rule: "text",
    },
  ];
}
