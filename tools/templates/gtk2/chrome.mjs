export function render(ctx) {
  return `style "vivid-life-notebook" {
  bg[NORMAL] = "${ctx.surface.bg_sunk}"
  bg[ACTIVE] = "${ctx.surface.bg_soft}"
  fg[NORMAL] = "${ctx.text.fg}"
  fg[ACTIVE] = "${ctx.text.fg_muted}"
}

class "GtkNotebook" style "vivid-life-notebook"

/* The class binding alone styles the notebook but not its tab text: GTK2
   draws a non-current tab's label with a child GtkLabel, which matches
   \`class "GtkWidget"\` and so took the default \`fg[ACTIVE]\` — accent-on —
   over a light tab. On Noon that is near-white on white, leaving every
   inactive tab unreadable. The muted colour above and the "inactive tab
   label" contrast pair below were both already correct; the rule simply
   never reached the widget that draws the text. Same mechanism as the
   checked-toggle label in button.mjs. */
widget_class "*<GtkNotebook>*<GtkLabel>" style "vivid-life-notebook"

/* …but that pattern matches every GtkLabel anywhere below a notebook, not
   just the ones in the tab strip, and a page-resident button's label is one
   of them. Its button still fills with bg[ACTIVE] = accent, so the label was
   left muted-on-accent: 1.03:1 on Dawn Red, effectively invisible.

   Narrowing to the direct-child form does not work either — a composite tab
   built with set_tab_label(page, hbox) puts its label at
   GtkNotebook.GtkHBox.GtkLabel, one level too deep, which re-opens the
   invisible-inactive-tab defect the binding above exists to fix.

   So the tab-strip rule stays broad and the page-content cases are restored
   after it, which works because gtkrc takes the LAST matching binding among
   equal-priority widget_class rules and these three match different paths:
   a tab label is under no button, a page button's label is, and a check or
   radio label is under a GtkCheckButton specifically. Each style below sets
   only fg[ACTIVE], so nothing else leaks into the widgets they re-cover. */
style "vivid-life-page-button" {
  fg[ACTIVE] = "${ctx.accentOn}"
}

widget_class "*<GtkNotebook>*<GtkButton>*<GtkLabel>" style "vivid-life-page-button"

/* GtkCheckButton derives from GtkButton, so the rule above would otherwise
   undo button.mjs's toggle fix inside a notebook. Rebound last. */
widget_class "*<GtkNotebook>*<GtkCheckButton>*<GtkLabel>" style "vivid-life-toggle"

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
