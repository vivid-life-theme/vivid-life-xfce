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

# control_border, not border.default: on Midnight the latter is #404040 and
# so is the menu surface (bg_overlay), so the separator divided nothing at
# all — 1.00:1. The WCAG exemption below is still right, because a separator
# is not a component whose state must be identifiable, but an exemption from
# 3:1 is not a licence to be invisible. control_border is derived to clear
# 3:1 against the surfaces and measures 3.10:1 here at worst.
style "vivid-life-menu-separator" {
  bg[NORMAL] = "${ctx.control.border}"
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
      // No exemption any more. It used to carry one because border.default
      // is the menu surface itself on Midnight (1.00:1); control_border
      // clears 3:1 on all 24, and `every exemption is still needed` fails if
      // a stale exemption is left behind — which is how this was caught.
      label: "menu separator",
      fg: ctx.control.border,
      bg: ctx.surface.bg_overlay,
      rule: "nontext",
    },
  ];
}
