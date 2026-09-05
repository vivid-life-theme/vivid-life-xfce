export function render(ctx) {
  return `* {
  outline-color: alpha(@vl_accent, 0.5);
}

window,
.background {
  background-color: @vl_bg;
  color: @vl_fg;
}`;
}
