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
   name) carry .dim-label's baked-in opacity: 0.55, which does not follow the
   row's selected state — so they stay washed out against the accent fill.

   Semantic text is promoted too, and phase 2's reasoning for leaving it out
   was measured and found wrong. It argued the semantic hue should "stay
   meaningful when the row is selected" — but a semantic token and an accent
   token are both chosen to contrast with the BACKGROUND, so they sit in the
   same luminance band and cannot reliably contrast with each other. Across
   all 24 combinations and three roles, 72 of 72 pairs fail 4.5:1 with the
   text in its own colour, the worst at 1.01:1 — and no token change can fix
   that (design-system 0.10.0 removed the five *identical* cases and the
   count stayed 72). Inside a selection the row's state carries the meaning;
   the text has to be readable first. Still scoped: not every label, only
   those whose own colour would otherwise fight the fill. */
*:selected .dim-label,
*:selected .subtitle,
*:selected .warning,
*:selected .error,
*:selected .success {
  color: @vl_accent_on;
  opacity: 1;
}`;
}

export function contrastPairs(ctx) {
  return [
    {
      // The pair that was never declared: semantic text over the selection
      // fill. Declared now that the text is promoted to accent_on — in its
      // own colour it failed 4.5:1 on 72 of 72 combinations.
      label: "semantic text inside a selected row",
      fg: ctx.accentOn,
      bg: ctx.accent,
      rule: "text",
    },
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
