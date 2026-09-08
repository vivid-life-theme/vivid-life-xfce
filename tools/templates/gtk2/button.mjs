export function render(ctx) {
  return `style "vivid-life-button" {
  bg[NORMAL]   = "${ctx.surface.bg_soft}"
  bg[PRELIGHT] = "${ctx.border.default}"
  bg[ACTIVE]   = "${ctx.accent}"
  fg[ACTIVE]   = "${ctx.accentOn}"
}

class "GtkButton" style "vivid-life-button"`;
}

export function contrastPairs(ctx) {
  return [
    {
      label: "button label",
      fg: ctx.text.fg,
      bg: ctx.surface.bg_soft,
      rule: "text",
    },
    {
      label: "button prelight label",
      fg: ctx.text.fg,
      bg: ctx.border.default,
      rule: "text",
    },
  ];
}
