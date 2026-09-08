export function render() {
  return `scrollbar slider {
  /* border.strong fails WCAG 1.4.11 (3:1, non-text UI) against surface.bg
     on Twilight (1.909:1) — text.fg_subtle clears 3:1 on all four flavors. */
  background-color: @vl_fg_subtle;
  border-radius: 6px;
  min-width: 6px;
  min-height: 6px;
}

scrollbar slider:hover {
  background-color: @vl_accent;
}`;
}

export function contrastPairs(ctx) {
  return [
    {
      label: "scrollbar slider",
      fg: ctx.text.fg_subtle,
      bg: ctx.surface.bg,
      rule: "nontext",
    },
  ];
}
