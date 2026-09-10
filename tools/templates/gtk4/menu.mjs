export function render(ctx) {
  return `/* GTK4 removed GtkMenu entirely: a menu is a popover carrying .menu and
   its entries are modelbutton nodes, so the GTK3 \`menu\`/\`menuitem\`
   selectors match nothing here. The fill goes on \`> contents\` — the
   popover node itself carries the shadow and is not the visible surface. */
popover > contents,
popover.background > contents {
  background-color: @vl_bg_overlay;
  color: @vl_fg;
  border: 1px solid @vl_control_border;
  border-radius: ${ctx.radius.md};
  padding: ${ctx.space["1"]};
}

/* The arrow is a sibling of contents, not a child, so it needs the surface
   named again or the pointer renders in GTK4's default colour. */
popover > arrow,
popover.background > arrow {
  background-color: @vl_bg_overlay;
  border: 1px solid @vl_control_border;
}

popover.menu modelbutton {
  border-radius: ${ctx.radius.sm};
  padding: ${ctx.space["1"]} ${ctx.space["2"]};
}

/* Fill plus accent_on rather than an accent mark: an accent indicator on
   bg_overlay is 2.76:1 on Midnight Red, below the 3:1 non-text floor.
   GTK4 drives menu-row highlight through \`:selected\`, set by the popover's
   keyboard/pointer navigation controller, not native pointer-in prelight —
   \`:hover\` never fires on this node in GTK4's own stylesheet. It is kept
   here as a harmless no-op in case a future version or a non-GNOME popover
   implementation uses prelight instead. */
popover.menu modelbutton:selected,
popover.menu modelbutton:hover {
  background-color: @vl_accent;
  color: @vl_accent_on;
}

popover.menu modelbutton:disabled {
  color: @vl_fg_disabled;
}

popover separator {
  background-color: @vl_border;
}

/* GTK4 names a menubar's children \`item\`, not \`menuitem\`. */
menubar {
  background-color: @vl_bg_soft;
  color: @vl_fg;
  border-bottom: 1px solid @vl_control_border;
}

menubar > item {
  padding: ${ctx.space["1"]} ${ctx.space["3"]};
  border-radius: 0;
}

menubar > item:selected,
menubar > item:hover {
  background-color: @vl_accent;
  color: @vl_accent_on;
}

menubar > item:disabled {
  color: @vl_fg_disabled;
}`;
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
      label: "menu entry selected label",
      fg: ctx.accentOn,
      bg: ctx.accent,
      rule: "text",
    },
    {
      label: "menu surface boundary",
      fg: ctx.control.border,
      bg: ctx.surface.bg,
      rule: "nontext",
    },
    {
      label: "menubar item label",
      fg: ctx.text.fg,
      bg: ctx.surface.bg_soft,
      rule: "text",
    },
    {
      label: "disabled menu entry label",
      fg: ctx.text.fg_disabled,
      bg: ctx.surface.bg_overlay,
      rule: "text",
      exempt: "WCAG 1.4.3 — text in an inactive user-interface component",
    },
  ];
}
