export function render(ctx) {
  return `style "vivid-life-default" {
  bg[NORMAL]      = "${ctx.surface.bg}"
  bg[PRELIGHT]    = "${ctx.surface.bg_soft}"
  bg[ACTIVE]      = "${ctx.accent}"
  bg[SELECTED]    = "${ctx.accent}"
  bg[INSENSITIVE] = "${ctx.surface.bg_soft}"

  fg[NORMAL]      = "${ctx.text.fg}"
  fg[PRELIGHT]    = "${ctx.text.fg}"
  fg[ACTIVE]      = "${ctx.accentOn}"
  fg[SELECTED]    = "${ctx.accentOn}"
  fg[INSENSITIVE] = "${ctx.text.fg_disabled}"

  base[NORMAL]    = "${ctx.surface.bg_sunk}"
  base[SELECTED]  = "${ctx.accent}"

  text[NORMAL]    = "${ctx.text.fg}"
  text[SELECTED]  = "${ctx.accentOn}"

  xthickness = 1
  ythickness = 1
}

class "GtkWidget" style "vivid-life-default"`;
}

export function contrastPairs(ctx) {
  return [
    { label: "window text", fg: ctx.text.fg, bg: ctx.surface.bg, rule: "text" },
    {
      label: "selected text",
      fg: ctx.accentOn,
      bg: ctx.accent,
      rule: "text",
    },
  ];
}
