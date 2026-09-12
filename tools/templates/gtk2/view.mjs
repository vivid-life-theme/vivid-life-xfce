export function render(ctx) {
  return `style "vivid-life-view" {
  base[NORMAL]   = "${ctx.surface.bg_sunk}"
  base[ACTIVE]   = "${ctx.accent}"
  base[SELECTED] = "${ctx.accent}"
  text[NORMAL]   = "${ctx.text.fg}"
  text[ACTIVE]   = "${ctx.accentOn}"
  text[SELECTED] = "${ctx.accentOn}"
}

class "GtkTextView" style "vivid-life-view"

# A tree view's column headers are GtkButtons, so without their own binding
# they inherit the full button style — a raised control where a flat header
# belongs. Same defect the GTK3 sweep found, in the form gtkrc can express.
style "vivid-life-column-header" {
  bg[NORMAL]   = "${ctx.surface.bg_soft}"
  bg[PRELIGHT] = "${ctx.surface.bg_overlay}"
  fg[NORMAL]   = "${ctx.text.fg_muted}"
  fg[PRELIGHT] = "${ctx.text.fg}"

  xthickness = 1
  ythickness = 0
}

widget_class "*<GtkTreeView>*<GtkButton>*" style "vivid-life-column-header"`;
}

export function contrastPairs(ctx) {
  return [
    {
      label: "text view body",
      fg: ctx.text.fg,
      bg: ctx.surface.bg_sunk,
      rule: "text",
    },
    {
      label: "selected row text",
      fg: ctx.accentOn,
      bg: ctx.accent,
      rule: "text",
    },
    {
      label: "column header label",
      fg: ctx.text.fg_muted,
      bg: ctx.surface.bg_soft,
      rule: "text",
    },
    {
      label: "column header prelight label",
      fg: ctx.text.fg,
      bg: ctx.surface.bg_overlay,
      rule: "text",
    },
  ];
}
