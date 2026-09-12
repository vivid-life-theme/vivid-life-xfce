export function render(ctx) {
  return `style "vivid-life-button" {
  bg[NORMAL]   = "${ctx.surface.bg_soft}"
  bg[PRELIGHT] = "${ctx.border.default}"
  bg[ACTIVE]   = "${ctx.accent}"
  fg[ACTIVE]   = "${ctx.accentOn}"
}

class "GtkButton" style "vivid-life-button"

/* GTK2's \`class\` matching includes subclasses, so the binding above also
   reaches GtkCheckButton and GtkRadioButton — and there its \`fg[ACTIVE]\` is
   wrong. A pressed GtkButton fills with the accent, so accent-on text is
   right; a checked toggle stays flat, so its LABEL is drawn in accent-on
   directly over the window background. On Midnight that is #171717 on
   #171717 and on Noon #f5f5f5 on #f5f5f5 — identical, so the label of every
   checked checkbox and radio button was invisible on all 24 combinations.

   The contrast gate could not see this: it declares fg[ACTIVE] against
   bg[ACTIVE], which is the accent fill and passes. The pair that actually
   occurs on screen — fg[ACTIVE] over bg[NORMAL] — was declared by nobody.
   Found by reading the GTK2 gallery; pinentry has no check buttons, so the
   application spot-check could never have shown it. */
style "vivid-life-toggle" {
  fg[ACTIVE]   = "${ctx.text.fg}"
  fg[PRELIGHT] = "${ctx.text.fg}"
}

/* \`widget_class\`, not \`class\`: the text is drawn by a child GtkLabel, which
   is its own widget and matches \`class "GtkWidget"\` — so a class binding on
   the button changes nothing the label reads. The descendant form is the
   same idiom menu.mjs already uses for GtkMenuItem's label. */
widget_class "*<GtkCheckButton>*" style "vivid-life-toggle"`;
}

export function contrastPairs(ctx) {
  return [
    {
      label: "button label",
      fg: ctx.text.fg,
      bg: ctx.surface.bg_soft,
      rule: "text",
    },
    {
      label: "button prelight label",
      fg: ctx.text.fg,
      bg: ctx.border.default,
      rule: "text",
    },
    {
      // The pair that was missing. A checked toggle's label sits on the
      // window background, not on the accent fill its bg[ACTIVE] implies.
      label: "checked toggle label",
      fg: ctx.text.fg,
      bg: ctx.surface.bg,
      rule: "text",
    },
  ];
}
