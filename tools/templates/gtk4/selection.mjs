export function render(ctx) {
  return `/* Composed last, and every widget it must beat is named explicitly.
   \`:selected\` alone uses no element or class selector, so it contributes
   zero specificity and loses to any rule that paints a background on a node
   that can be selected — columnview.view and .sidebar row are both (0,1,1)
   and would silently unhighlight every selected row. Source order does not
   rescue it; matching their specificity does. */
:selected,
selection {
  background-color: @vl_accent;
  color: @vl_accent_on;
}

columnview.view:selected,
treeview.view:selected,
listview > row:selected,
list > row:selected,
.sidebar row:selected,
.navigation-sidebar row:selected,
placessidebar row:selected,
stacksidebar row:selected,
iconview:selected {
  background-color: @vl_accent;
  color: @vl_accent_on;
}

/* Deliberately narrow. The broad form — every label under a selected row —
   also flattens .warning/.error/.success text inside that row, which is the
   defect the GTK3 port carried until phase 2. Only the dimmed secondary
   labels need promoting, because they are the ones that would otherwise
   stay muted against an accent fill. */
:selected .dim-label,
:selected .subtitle {
  color: @vl_accent_on;
}`;
}

export function contrastPairs(ctx) {
  return [
    {
      label: "selected row label",
      fg: ctx.accentOn,
      bg: ctx.accent,
      rule: "text",
    },
    {
      label: "selected row subtitle",
      fg: ctx.accentOn,
      bg: ctx.accent,
      rule: "text",
    },
  ];
}
