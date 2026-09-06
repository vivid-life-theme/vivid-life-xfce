import { composite } from "../../lib/contrast.mjs";

export function render(ctx) {
  return `treeview.view,
iconview {
  background-color: @vl_bg_sunk;
  color: @vl_fg;
  border-radius: ${ctx.radius.sm};
}

/* GTK renders a tree view's column headers as button nodes, so without a
   rule they inherit the full button chrome — a raised, bordered, rounded
   control where a flat header belongs. */
treeview.view header button {
  background-color: @vl_bg_soft;
  color: @vl_fg_muted;
  border: none;
  border-bottom: 1px solid @vl_control_border;
  border-radius: 0;
  padding: ${ctx.space["1"]} ${ctx.space["2"]};
}

/* Promoted to fg, not left muted: fg_muted over the hover composite is
   3.70:1, below the 4.5:1 text floor. */
treeview.view header button:hover {
  background-color: alpha(@vl_accent, 0.2);
  color: @vl_fg;
}

/* treeview.view is (0,1,1) and *:selected is (0,1,0), so the surface rule
   above outranks the global selection fill and a selected row would render
   unhighlighted. Restate selection at this specificity rather than weakening
   the surface rule — selection.mjs cannot reach here on its own. */
treeview.view:selected,
treeview.view:selected:focus,
iconview:selected,
iconview:selected:focus {
  background-color: @vl_accent;
  color: @vl_accent_on;
}

treeview.view expander {
  color: @vl_fg_muted;
}

/* Rows stay transparent so the view's surface shows through and the
   *:selected fill is the only thing that paints a row. */
list,
list row {
  background-color: transparent;
}

list row {
  padding: ${ctx.space["1"]} ${ctx.space["2"]};
}

list row:hover {
  background-color: alpha(@vl_accent, 0.2);
  color: @vl_fg;
}`;
}

export function contrastPairs(ctx) {
  return [
    {
      label: "tree view text",
      fg: ctx.text.fg,
      bg: ctx.surface.bg_sunk,
      rule: "text",
    },
    {
      label: "column header label",
      fg: ctx.text.fg_muted,
      bg: ctx.surface.bg_soft,
      rule: "text",
    },
    {
      label: "column header rule",
      fg: ctx.control.border,
      bg: ctx.surface.bg_soft,
      rule: "nontext",
    },
    {
      label: "selected tree/icon view row",
      fg: ctx.accentOn,
      bg: ctx.accent,
      rule: "text",
    },
    {
      label: "tree row expander",
      fg: ctx.text.fg_muted,
      bg: ctx.surface.bg_sunk,
      rule: "nontext",
    },
    {
      label: "list row hover label",
      fg: ctx.text.fg,
      bg: composite(ctx.surface.bg, `${ctx.accent}33`),
      rule: "text",
    },
    {
      label: "column header hover label",
      fg: ctx.text.fg,
      bg: composite(ctx.surface.bg_soft, `${ctx.accent}33`),
      rule: "text",
    },
  ];
}
