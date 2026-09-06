import { composite } from "../../lib/contrast.mjs";

export function render(ctx) {
  return `menu,
.menu {
  background-color: @vl_bg_overlay;
  color: @vl_fg;
  border: 1px solid @vl_border;
  border-radius: 6px;
  padding: 4px;
}

menuitem {
  padding: 6px 10px;
  border-radius: 4px;
}

menuitem:hover {
  background-color: alpha(@vl_accent, 0.2);
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
  ];
}
