import { shade } from "../../lib/contrast.mjs";

export function render(ctx) {
  return `button {
  background-color: @vl_bg_soft;
  color: @vl_fg;
  border: 1px solid @vl_control_border;
  border-radius: 4px;
  padding: 4px 10px;
}

button:hover {
  background-color: shade(@vl_bg_soft, 1.08);
}

button:active,
button:checked {
  background-color: @vl_accent;
  color: @vl_accent_on;
}

button:disabled {
  color: @vl_fg_disabled;
}

button.suggested-action {
  background-color: @vl_accent;
  color: @vl_accent_on;
  border-color: @vl_accent;
}

button.destructive-action {
  background-color: @vl_danger;
  color: @vl_accent_on;
}

/* A linked group is one control drawn as several: square the interior
   corners and collapse the shared edges so three buttons read as a
   segmented control rather than three adjacent controls. Uses the sibling
   combinator rather than chained :not(), which GTK's CSS parser handles
   less predictably. */
.linked > button {
  border-radius: 0;
}

.linked > button:first-child {
  border-top-left-radius: ${ctx.radius.sm};
  border-bottom-left-radius: ${ctx.radius.sm};
}

.linked > button:last-child {
  border-top-right-radius: ${ctx.radius.sm};
  border-bottom-right-radius: ${ctx.radius.sm};
}

.linked > button + button {
  border-left-width: 0;
}`;
}

export function contrastPairs(ctx) {
  return [
    {
      label: "button boundary",
      fg: ctx.control.border,
      bg: ctx.surface.bg_soft,
      rule: "nontext",
    },
    {
      label: "button label",
      fg: ctx.text.fg,
      bg: ctx.surface.bg_soft,
      rule: "text",
    },
    {
      label: "button hover label",
      fg: ctx.text.fg,
      bg: shade(ctx.surface.bg_soft, 1.08),
      rule: "text",
    },
    {
      label: "accent button label",
      fg: ctx.accentOn,
      bg: ctx.accent,
      rule: "text",
    },
    {
      label: "destructive button label",
      fg: ctx.accentOn,
      bg: ctx.semantic.danger,
      rule: "text",
    },
    {
      label: "disabled button label",
      fg: ctx.text.fg_disabled,
      bg: ctx.surface.bg_soft,
      rule: "text",
      exempt: "WCAG 1.4.3 — text in an inactive user-interface component",
    },
  ];
}
