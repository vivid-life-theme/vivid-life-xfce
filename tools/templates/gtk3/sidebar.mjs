// A sidebar's surface cannot be painted on the sidebar node. GTK nests a
// scrolledwindow and a viewport between that node and the list, and the
// outer node does not render a background of its own — measured, a rule on
// `stacksidebar` alone leaves GTK's default showing through no matter what
// the inner nodes do. The viewport and the list are the nodes that paint,
// so the surface goes there and the scrolledwindow is cleared out of the way.
const ROOTS = [".sidebar", "placessidebar", "stacksidebar"];

function each(node) {
  return ROOTS.map((root) => `${root} ${node}`).join(",\n");
}

export function render(ctx) {
  return `${ROOTS.join(",\n")} {
  color: @vl_fg;
}

${each("scrolledwindow")} {
  background-color: transparent;
}

${each("viewport")},
${each("list")} {
  background-color: @vl_bg_soft;
}

${each("list")} {
  border-right: 1px solid @vl_control_border;
}

/* Rows stay transparent so the sidebar's surface shows through and
   *:selected is the only thing that fills one. An accent stripe on the row
   instead would be 2.76:1 against bg_soft on Midnight Red. */
${each("row")} {
  background-color: transparent;
  padding: ${ctx.space["1"]} ${ctx.space["3"]};
  border-radius: ${ctx.radius.sm};
}

/* The rule above is (0,1,1) and *:selected is (0,1,0), so clearing the row
   background silently outranks the global selection fill. Restate it here
   rather than weakening the rule — the same trap as treeview.view. */
${each("row:selected")} {
  background-color: @vl_accent;
  color: @vl_accent_on;
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
      label: "selected sidebar row",
      fg: ctx.accentOn,
      bg: ctx.accent,
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
