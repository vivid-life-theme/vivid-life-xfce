export function render(ctx) {
  return `button {
  background-color: @vl_bg_soft;
  color: @vl_fg;
  border: 1px solid @vl_border;
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
}`;
}
