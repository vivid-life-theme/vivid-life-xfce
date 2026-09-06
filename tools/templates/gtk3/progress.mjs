export function render(ctx) {
  return `progressbar > trough {
  background-color: @vl_bg_sunk;
  border-radius: 4px;
}

progressbar > trough > progress {
  background-color: @vl_accent;
  border-radius: 4px;
}`;
}
