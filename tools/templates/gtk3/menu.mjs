export function render(ctx) {
  return `menu,
.menu {
  background-color: @vl_bg_overlay;
  color: @vl_fg;
  border: 1px solid @vl_border;
  border-radius: 6px;
  padding: 4px;
}

menuitem {
  padding: 6px 10px;
  border-radius: 4px;
}

menuitem:hover {
  background-color: alpha(@vl_accent, 0.2);
}`;
}
