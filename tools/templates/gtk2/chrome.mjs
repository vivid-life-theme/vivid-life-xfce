export function render(ctx) {
  return `style "vivid-life-notebook" {
  bg[NORMAL] = "${ctx.surface.bg_sunk}"
  bg[ACTIVE] = "${ctx.surface.bg_soft}"
  fg[NORMAL] = "${ctx.text.fg}"
  fg[ACTIVE] = "${ctx.text.fg_muted}"
}

class "GtkNotebook" style "vivid-life-notebook"

# bg[NORMAL] is the trough; the bar itself is drawn with the selected
# colours, which is why an accent progress bar needs no separate key.
style "vivid-life-progress" {
  bg[NORMAL]   = "${ctx.surface.bg_sunk}"
  bg[PRELIGHT] = "${ctx.accent}"
  bg[SELECTED] = "${ctx.accent}"
  fg[PRELIGHT] = "${ctx.accentOn}"
}

class "GtkProgressBar" style "vivid-life-progress"

# Toolbar buttons are flat until touched, matching the GTK3 and GTK4
# toolbars: chrome buttons that each drew a full raised edge would turn a
# toolbar into a grid.
style "vivid-life-toolbar-button" {
  bg[NORMAL]   = "${ctx.surface.bg_soft}"
  bg[PRELIGHT] = "${ctx.surface.bg_overlay}"
  fg[NORMAL]   = "${ctx.text.fg}"
}

widget_class "*<GtkToolbar>*<GtkButton>" style "vivid-life-toolbar-button"

widget_class "*<GtkComboBox>.<GtkButton>" style "vivid-life-button"`;
}

export function contrastPairs(ctx) {
  return [
    {
      label: "notebook tab label",
      fg: ctx.text.fg,
      bg: ctx.surface.bg_sunk,
      rule: "text",
    },
    {
      label: "inactive tab label",
      fg: ctx.text.fg_muted,
      bg: ctx.surface.bg_soft,
      rule: "text",
    },
    {
      label: "progress fill against its trough",
      fg: ctx.accent,
      bg: ctx.surface.bg_sunk,
      rule: "nontext",
    },
    {
      label: "toolbar button label",
      fg: ctx.text.fg,
      bg: ctx.surface.bg_soft,
      rule: "text",
    },
    {
      label: "toolbar button prelight label",
      fg: ctx.text.fg,
      bg: ctx.surface.bg_overlay,
      rule: "text",
    },
  ];
}
