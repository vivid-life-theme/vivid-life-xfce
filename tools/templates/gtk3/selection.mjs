export function render(ctx) {
  return `/* Text selection (entry/textview) only — the design system's state.selection
   token is a deliberately muted blend, distinct from the row/menu-item
   "selected" affordance below. */
selection {
  background-color: @vl_selection;
  color: @vl_fg;
}

/* *:selected covers listbox/treeview rows and menu items (Whisker Menu
   categories, the Appearance theme list, etc.) and needs to read as clearly
   selected. Opaque on purpose: *:selected is a universal selector with no
   single backdrop, so this reuses the same solid accent + accent_on pairing
   as button:active/check:checked rather than a translucent overlay whose
   contrast against an arbitrary ancestor can't be verified. */
*:selected {
  background-color: @vl_accent;
  color: @vl_accent_on;
}

/* Subtitle/secondary labels (e.g. the "Gtk3, Gtk2, Xfwm4" line under a theme
   name) are commonly drawn with .dim-label's baked-in opacity: 0.55, or an
   app-set foreground colour, neither of which follows *:selected's color
   automatically. Force both back to full contrast on a selected row. */
*:selected label,
*:selected .dim-label {
  color: @vl_accent_on;
  opacity: 1;
}`;
}

export function contrastPairs(ctx) {
  return [
    {
      label: "text selection",
      fg: ctx.text.fg,
      bg: ctx.state.selection,
      rule: "text",
    },
    {
      label: "row/menu selection label",
      fg: ctx.accentOn,
      bg: ctx.accent,
      rule: "text",
    },
  ];
}
