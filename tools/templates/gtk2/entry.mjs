export function render(ctx) {
  return `style "vivid-life-entry" {
  base[NORMAL] = "${ctx.surface.bg_sunk}"
  text[NORMAL] = "${ctx.text.fg}"
}

class "GtkEntry" style "vivid-life-entry"`;
}

export function contrastPairs(ctx) {
  return [
    {
      label: "entry text",
      fg: ctx.text.fg,
      bg: ctx.surface.bg_sunk,
      rule: "text",
    },
  ];
}
