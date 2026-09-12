export function render(ctx) {
  return `/* \`.navigation-sidebar\` is GTK4-only — 22 rules in GTK4's own sheet, zero
   in GTK3 — and it is the class modern GTK4/libadwaita apps actually put on
   sidebar rows. Without it the most visible widget in a modern GTK4 app falls
   back to unstyled rows. Upstream writes \`> row\`; the descendant forms below
   are a superset, so they match that and any wrapped variant. */
.sidebar,
.navigation-sidebar,
placessidebar,
stacksidebar {
  background-color: @vl_bg_soft;
  color: @vl_fg;
  border-right: 1px solid @vl_control_border;
}

/* Phase 2's lesson, and it holds in GTK4: some container nodes render no
   background of their own. A sidebar nests a scrolledwindow and a viewport,
   and only the inner nodes paint, so the surface goes on those and the
   scrolledwindow is cleared. */
.sidebar scrolledwindow,
.navigation-sidebar scrolledwindow,
placessidebar scrolledwindow,
stacksidebar scrolledwindow {
  background-color: transparent;
}

.sidebar viewport,
.sidebar list,
.navigation-sidebar viewport,
.navigation-sidebar list,
placessidebar viewport,
placessidebar list,
stacksidebar viewport,
stacksidebar list {
  background-color: @vl_bg_soft;
}

/* Rows stay transparent so the sidebar's own surface shows through and
   selection is the only thing that fills a row. An accent stripe on the row
   instead would be 2.76:1 against bg_soft on Midnight Red. */
.sidebar row,
.navigation-sidebar row,
placessidebar row,
stacksidebar row {
  background-color: transparent;
  padding: ${ctx.space["1"]} ${ctx.space["3"]};
  border-radius: ${ctx.radius.sm};
}`;
}

export function contrastPairs(ctx) {
  return [
    {
      label: "sidebar label",
      fg: ctx.text.fg,
      bg: ctx.surface.bg_soft,
      rule: "text",
    },
    {
      label: "sidebar boundary",
      fg: ctx.control.border,
      bg: ctx.surface.bg_soft,
      rule: "nontext",
    },
  ];
}
