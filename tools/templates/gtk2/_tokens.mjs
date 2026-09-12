// GTK2 reads these keys directly, in the default drawing code and in
// applications that resolve @named colours. Setting all of them is the
// cheapest coverage this target has: every one reaches widgets no style
// block of ours is bound to.
//
// The value is one gtkrc string with escaped newlines, which is why the
// pairs are assembled rather than written out — a literal here would be a
// single 400-character line nobody can diff.
const schemeKeys = (ctx) => [
  ["bg_color", ctx.surface.bg],
  ["fg_color", ctx.text.fg],
  ["base_color", ctx.surface.bg_sunk],
  ["text_color", ctx.text.fg],
  ["selected_bg_color", ctx.accent],
  ["selected_fg_color", ctx.accentOn],
  ["insensitive_bg_color", ctx.surface.bg_soft],
  ["insensitive_fg_color", ctx.text.fg_disabled],
  ["menu_color", ctx.surface.bg_overlay],
  ["tooltip_bg_color", ctx.surface.bg_overlay],
  ["tooltip_fg_color", ctx.text.fg],
  ["link_color", ctx.accent],
  ["visited_link_color", ctx.text.fg_muted],
];

export function render(ctx) {
  const scheme = schemeKeys(ctx)
    .map(([key, value]) => `${key}:${value}`)
    .join("\\n");
  return `gtk-color-scheme = "${scheme}"`;
}

export function contrastPairs(ctx) {
  return [
    { label: "link text", fg: ctx.accent, bg: ctx.surface.bg, rule: "text" },
    {
      label: "visited link text",
      fg: ctx.text.fg_muted,
      bg: ctx.surface.bg,
      rule: "text",
    },
  ];
}
