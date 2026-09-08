export function render(ctx) {
  return `gtk-color-scheme = "bg_color:${ctx.surface.bg}\\nfg_color:${ctx.text.fg}\\nbase_color:${ctx.surface.bg_sunk}\\ntext_color:${ctx.text.fg}\\nselected_bg_color:${ctx.accent}\\nselected_fg_color:${ctx.accentOn}"`;
}
