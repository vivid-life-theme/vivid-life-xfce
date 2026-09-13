import { composite } from "../../lib/contrast.mjs";

export function render(ctx) {
  return `menu,
.menu {
  background-color: @vl_bg_overlay;
  color: @vl_fg;
  border: 1px solid @vl_control_border;
  border-radius: 6px;
  padding: 4px;
}

menuitem {
  padding: 6px 10px;
  border-radius: 4px;
}

menuitem:hover {
  background-color: alpha(@vl_accent, 0.2);
}

menubar {
  background-color: @vl_bg_soft;
  color: @vl_fg;
  border-bottom: 1px solid @vl_control_border;
}

menubar > menuitem {
  padding: ${ctx.space["1"]} ${ctx.space["3"]};
  border-radius: 0;
}

/* Fill plus accent_on rather than an accent underline: an accent mark on
   bg_soft is 2.76:1 on Midnight Red, below the 3:1 non-text floor. */
menubar > menuitem:hover {
  background-color: @vl_accent;
  color: @vl_accent_on;
}

/* A popover is a menu that is not a menu node — same surface, same
   boundary, so a Whisker-style popup and a dropdown read as one family. */
popover,
popover.background {
  background-color: @vl_bg_overlay;
  color: @vl_fg;
  border: 1px solid @vl_control_border;
  border-radius: ${ctx.radius.md};
  padding: ${ctx.space["1"]};
}

popover separator {
  background-color: @vl_border;
}

/* Whisker Menu is the popup that produced the original two-tone report, and
   it is neither a \`menu\` nor a \`popover\`: it is a GtkWindow whose widget
   NAME is whiskermenu-window (probed — \`#whiskermenu-window\` matches,
   \`.whiskermenu-window\` does not), holding a tree view of apps beside a
   column of GtkToggleButtons classed .category-button. The phase-2 gallery
   modelled it as two list boxes, which is why phase 2's fix and its
   verification both missed the real widgets. Measured on the live plugin:
   the tree view sat on bg_sunk, the button column on bg — the spec's rule
   for this popup is every pane or none. So the window takes the popup
   surface like menu and popover do, and its tree view goes transparent so
   both panes show that one surface. */
#whiskermenu-window {
  background-color: @vl_bg_overlay;
  color: @vl_fg;
  border: 1px solid @vl_control_border;
}

#whiskermenu-window treeview.view {
  background-color: transparent;
}`;
}

export function contrastPairs(ctx) {
  return [
    {
      label: "menu item label",
      fg: ctx.text.fg,
      bg: ctx.surface.bg_overlay,
      rule: "text",
    },
    // menuitem:hover paints alpha(@vl_accent, 0.2) over the menu's own
    // bg_overlay, so the backdrop is determinate. GTK's alpha(colour, f)
    // becomes an #rrggbbaa overlay: 0.2 -> 33.
    {
      label: "menu item hover label",
      fg: ctx.text.fg,
      bg: composite(ctx.surface.bg_overlay, `${ctx.accent}33`),
      rule: "text",
    },
    {
      label: "menubar item label",
      fg: ctx.text.fg,
      bg: ctx.surface.bg_soft,
      rule: "text",
    },
    {
      label: "menubar item hover label",
      fg: ctx.accentOn,
      bg: ctx.accent,
      rule: "text",
    },
  ];
}
