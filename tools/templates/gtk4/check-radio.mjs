export function render(ctx) {
  return `/* GTK4 wraps both in a checkbutton; the indicator keeps the GTK3 node
   names, so both the wrapped and bare forms are addressed. */
checkbutton > check,
checkbutton > radio,
check,
radio {
  background-color: @vl_bg_sunk;
  border: 1px solid @vl_control_border;
  min-width: 14px;
  min-height: 14px;
}

check {
  border-radius: ${ctx.radius.sm};
}

radio {
  border-radius: 50%;
}

checkbutton > check:checked,
checkbutton > radio:checked,
check:checked,
radio:checked {
  background-color: @vl_accent;
  border-color: @vl_accent;
  color: @vl_accent_on;
}

/* A theme replaces GTK4's default stylesheet, which is what supplies the
   tick and the dot, so without a rule here a checked indicator fills with
   accent and shows no mark — the same defect phase 2 hit with expander
   arrows. But the two cases cannot be solved the same way, and this is the
   one place in the port where that matters:

   GTK4's default sources both glyphs from theme-relative assets
   (url("assets/check-symbolic.symbolic.png") and bullet-symbolic). Those
   live under theme/Default/assets/ in GTK's gresource, NOT under icons/,
   so they are private to that theme and -gtk-icontheme() cannot reach
   them. Our theme ships no assets and must not start (see the repo's "do
   not bundle icons" rule), so a url() reference is not available either.

   The tick has a standard icon-theme equivalent: object-select-symbolic is
   in GTK's own icons/scalable/actions, so naming it adds no dependency.
   The dot has none — there is no bullet or circle glyph in the icon theme
   at all — so the radio draws its dot in CSS instead: an accent fill with
   an inset ring of the surface colour, leaving an accent core. */
checkbutton > check:checked,
check:checked {
  -gtk-icon-source: -gtk-icontheme("object-select-symbolic");
}

checkbutton > radio:checked,
radio:checked {
  -gtk-icon-source: none;
  box-shadow: inset 0 0 0 3px @vl_bg_sunk;
}

checkbutton:disabled,
check:disabled,
radio:disabled {
  color: @vl_fg_disabled;
}`;
}

export function contrastPairs(ctx) {
  return [
    {
      label: "checked indicator glyph",
      fg: ctx.accentOn,
      bg: ctx.accent,
      rule: "nontext",
    },
    {
      // The radio's dot is drawn, not sourced: accent showing through an
      // inset ring of bg_sunk. That makes accent-on-bg_sunk the pair that
      // decides whether the dot is visible — 3.49:1 at worst, noon orange.
      label: "radio dot",
      fg: ctx.accent,
      bg: ctx.surface.bg_sunk,
      rule: "nontext",
    },
    {
      label: "indicator boundary",
      fg: ctx.control.border,
      bg: ctx.surface.bg,
      rule: "nontext",
    },
  ];
}
