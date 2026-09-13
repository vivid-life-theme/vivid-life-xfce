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

/* Scoped, not broad: only labels whose own colour would otherwise fight the
   accent fill. That now includes semantic text, and phase 2's reason for
   excluding it was measured and found wrong — a semantic token and an
   accent token are both picked to contrast with the BACKGROUND, so they sit
   in the same luminance band and cannot reliably contrast with each other.
   72 of 72 semantic-over-accent pairs fail 4.5:1 across the 24 combinations,
   worst 1.01:1, and design-system 0.10.0 removing the five identical cases
   left the count at 72. Inside a selection the row's state carries the
   meaning; the text has to be readable first. (0,2,0) beats the bare
   .warning class at (0,1,0) regardless of order. */
:selected .dim-label,
:selected .subtitle,
:selected .warning,
:selected .error,
:selected .success {
  color: @vl_accent_on;
}`;
}

export function contrastPairs(ctx) {
  return [
    {
      // The pair that was never declared: semantic text over the selection
      // fill. Declared now that the text is promoted to accent_on — in its
      // own colour it failed 4.5:1 on 72 of 72 combinations.
      label: "semantic text inside a selected row",
      fg: ctx.accentOn,
      bg: ctx.accent,
      rule: "text",
    },
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
