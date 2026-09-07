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
