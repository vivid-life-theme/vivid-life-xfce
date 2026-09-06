export function render(ctx) {
  return `check,
radio {
  background-color: @vl_bg_soft;
  border: 1px solid @vl_border;
}

check:checked,
radio:checked {
  background-color: @vl_accent;
  border-color: @vl_accent;
  color: @vl_accent_on;
}`;
}
