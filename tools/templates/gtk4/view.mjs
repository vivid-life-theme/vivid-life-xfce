import { composite } from "../../lib/contrast.mjs";

export function render(ctx) {
  return `/* columnview and listview are GTK4's modern list widgets; treeview is
   deprecated but still present in 4.14 and still rendered by ported apps. */
columnview.view,
treeview.view,
listview,
iconview {
  background-color: @vl_bg_sunk;
  color: @vl_fg;
  border-radius: ${ctx.radius.sm};
}

/* Column headers are button nodes, so without a rule they inherit the full
   raised-button chrome where a flat header belongs. */
columnview.view header button,
treeview.view header button {
  background-color: @vl_bg_soft;
  color: @vl_fg_muted;
  border: none;
  border-bottom: 1px solid @vl_control_border;
  border-radius: 0;
  margin: 0;
  padding: ${ctx.space["1"]} ${ctx.space["2"]};
}

/* Promoted to fg, not left muted: fg_muted over the hover composite is
   3.70:1, below the 4.5:1 text floor. */
columnview.view header button:hover,
treeview.view header button:hover {
  background-color: alpha(@vl_accent, 0.2);
  color: @vl_fg;
}

/* A theme replaces GTK4's default stylesheet, and that default is what
   supplies -gtk-icon-source for arrow nodes. Without naming the icon these
   render as an empty indent, and setting color alone cannot fix it —
   there is no glyph to tint. GTK ships pan-* in its own gresource. */
columnview.view.expander,
treeview.view.expander,
treeexpander > expander {
  -gtk-icon-source: -gtk-icontheme("pan-end-symbolic");
  color: @vl_fg_muted;
  min-width: 16px;
  min-height: 16px;
}

columnview.view.expander:checked,
treeview.view.expander:checked,
treeexpander > expander:checked {
  -gtk-icon-source: -gtk-icontheme("pan-down-symbolic");
}

/* Rows stay transparent so the view's surface shows through and the
   selection fill is the only thing that paints a row. */
list,
list > row,
listview > row {
  background-color: transparent;
}

list > row,
listview > row {
  padding: ${ctx.space["1"]} ${ctx.space["2"]};
}

list > row:hover,
listview > row:hover {
  background-color: alpha(@vl_accent, 0.2);
  color: @vl_fg;
}`;
}

export function contrastPairs(ctx) {
  return [
    {
      label: "list view text",
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
      label: "tree row expander",
      fg: ctx.text.fg_muted,
      bg: ctx.surface.bg_sunk,
      rule: "nontext",
    },
    {
      label: "list row hover label",
      fg: ctx.text.fg,
      bg: composite(ctx.surface.bg_sunk, `${ctx.accent}33`),
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
