export function render(ctx) {
  return `entry {
  background-color: @vl_bg_sunk;
  color: @vl_fg;
  border: 1px solid @vl_control_border;
  border-radius: ${ctx.radius.sm};
  padding: ${ctx.space["1"]} ${ctx.space["2"]};
}

/* GTK4 puts the editable text, caret and placeholder on a \`text\` child.
   Without a rule here the field's own background paints over them on some
   themes and the placeholder keeps GTK4's default opacity. */
entry > text {
  background-color: transparent;
  color: @vl_fg;
}

entry > text > placeholder {
  color: @vl_fg_muted;
}

/* GTK4 focuses the child, so the state lands on the parent as
   :focus-within. \`entry:focus\` never matches and the ring never appears. */
entry:focus-within {
  border-color: @vl_accent;
}

entry:disabled {
  color: @vl_fg_disabled;
}

/* GtkComboBox is deprecated in GTK4 and GtkDropDown is the replacement, so
   both nodes are styled — an app using either is covered. */
dropdown > button,
combobox > button {
  border-radius: ${ctx.radius.sm};
}

dropdown arrow,
combobox arrow {
  color: @vl_fg_muted;
  min-width: ${ctx.space["4"]};
  min-height: ${ctx.space["4"]};
}`;
}

export function contrastPairs(ctx) {
  return [
    {
      label: "entry text",
      fg: ctx.text.fg,
      bg: ctx.surface.bg_sunk,
      rule: "text",
    },
    {
      label: "entry placeholder",
      fg: ctx.text.fg_muted,
      bg: ctx.surface.bg_sunk,
      rule: "text",
    },
    {
      label: "entry boundary",
      fg: ctx.control.border,
      bg: ctx.surface.bg,
      rule: "nontext",
    },
    {
      label: "dropdown arrow",
      fg: ctx.text.fg_muted,
      bg: ctx.surface.bg_soft,
      rule: "nontext",
    },
  ];
}
