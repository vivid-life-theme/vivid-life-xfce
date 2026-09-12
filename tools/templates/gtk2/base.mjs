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

  base[NORMAL]      = "${ctx.surface.bg_sunk}"
  base[SELECTED]    = "${ctx.accent}"
  base[ACTIVE]      = "${ctx.accent}"
  base[INSENSITIVE] = "${ctx.surface.bg_soft}"

  text[NORMAL]      = "${ctx.text.fg}"
  text[SELECTED]    = "${ctx.accentOn}"
  text[ACTIVE]      = "${ctx.accentOn}"
  text[INSENSITIVE] = "${ctx.text.fg_disabled}"

  xthickness = 1
  ythickness = 1
}

class "GtkWidget" style "vivid-life-default"

# A frame's edge is drawn with the shadow colours GTK2 derives from
# bg[NORMAL], which on our surfaces is too close to the canvas to read.
# Naming bg[NORMAL] as the control boundary is the only lever a
# non-engine gtkrc has for a frame outline.
style "vivid-life-frame" {
  bg[NORMAL] = "${ctx.control.border}"
}

class "GtkFrame" style "vivid-life-frame"

style "vivid-life-scrolled" {
  bg[NORMAL] = "${ctx.surface.bg_sunk}"
}

class "GtkScrolledWindow" style "vivid-life-scrolled"`;
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
    {
      label: "frame boundary",
      fg: ctx.control.border,
      bg: ctx.surface.bg,
      rule: "nontext",
    },
    {
      label: "insensitive label",
      fg: ctx.text.fg_disabled,
      bg: ctx.surface.bg_soft,
      rule: "text",
      exempt: "WCAG 1.4.3 — text in an inactive user-interface component",
    },
  ];
}
