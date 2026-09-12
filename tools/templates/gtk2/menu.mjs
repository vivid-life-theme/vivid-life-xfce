export function render(ctx) {
  return `style "vivid-life-menu" {
  bg[NORMAL]   = "${ctx.surface.bg_overlay}"
  fg[NORMAL]   = "${ctx.text.fg}"
  text[NORMAL] = "${ctx.text.fg}"
}

class "GtkMenu" style "vivid-life-menu"

style "vivid-life-menubar" {
  bg[NORMAL] = "${ctx.surface.bg_soft}"
  fg[NORMAL] = "${ctx.text.fg}"
}

class "GtkMenuBar" style "vivid-life-menubar"

# GTK2 draws a menu entry's prelight as bg[PRELIGHT] with fg[PRELIGHT] on
# top. Fill plus accent_on rather than an accent mark, for the same reason
# as GTK3 and GTK4: an accent indicator on bg_overlay is 2.76:1 on Midnight
# Red, below the 3:1 non-text floor.
style "vivid-life-menuitem" {
  bg[PRELIGHT]    = "${ctx.accent}"
  fg[PRELIGHT]    = "${ctx.accentOn}"
  fg[NORMAL]      = "${ctx.text.fg}"
  fg[INSENSITIVE] = "${ctx.text.fg_disabled}"
}

widget_class "*<GtkMenuItem>*" style "vivid-life-menuitem"

# Menubar entries sit on bg_soft rather than on the menu surface. The more
# specific widget_class path wins between two widget_class matches, so this
# narrows the rule above rather than racing it.
widget_class "*<GtkMenuBar>.<GtkMenuItem>*" style "vivid-life-menuitem"

style "vivid-life-menu-separator" {
  bg[NORMAL] = "${ctx.border.default}"
}

widget_class "*<GtkSeparatorMenuItem>*" style "vivid-life-menu-separator"`;
}

export function contrastPairs(ctx) {
  return [
    {
      label: "menu entry label",
      fg: ctx.text.fg,
      bg: ctx.surface.bg_overlay,
      rule: "text",
    },
    {
      label: "menu entry prelight label",
      fg: ctx.accentOn,
      bg: ctx.accent,
      rule: "text",
    },
    {
      label: "menubar item label",
      fg: ctx.text.fg,
      bg: ctx.surface.bg_soft,
      rule: "text",
    },
    {
      label: "menu separator",
      fg: ctx.border.default,
      bg: ctx.surface.bg_overlay,
      rule: "nontext",
      exempt:
        "WCAG 1.4.11 — decorative separator, not a UI component whose state must be identifiable",
    },
  ];
}
