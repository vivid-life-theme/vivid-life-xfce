#!/bin/sh
# Captures the GTK4 gallery under all 24 themes and montages one contact
# sheet per flavor, mirroring shots.sh for the GTK3 gallery.
#
# Optional tooling: skips with a message rather than failing a fresh clone.
set -eu

here=$(dirname "$0")
out="$here/out"

if ! /usr/bin/python3 -c "import gi; gi.require_version('Gtk','4.0')" 2>/dev/null; then
  echo "preview:shots4 — skipped: GTK4 GObject bindings not installed." >&2
  echo "  (Debian/Ubuntu: sudo apt install gir1.2-gtk-4.0)" >&2
  exit 0
fi
if ! command -v xvfb-run >/dev/null 2>&1; then
  echo "preview:shots4 — skipped: xvfb-run not installed (package xvfb)." >&2
  exit 0
fi
if command -v magick >/dev/null 2>&1; then
  montage_cmd="magick montage"
  import_cmd="magick import"
elif command -v montage >/dev/null 2>&1; then
  montage_cmd="montage"
  import_cmd="import"
else
  echo "preview:shots4 — skipped: ImageMagick not installed." >&2
  exit 0
fi

# Same font resolution as shots.sh: this ImageMagick build ships no font
# configuration, so a bare -label fails with "unable to read font ''".
label_args="-label %t -pointsize 18"
font=$(fc-match -f '%{file}' sans 2>/dev/null || true)
if [ -n "$font" ] && [ -f "$font" ]; then
  label_args="$label_args -font $font"
else
  echo "preview:shots4 — no font found; contact sheets will be unlabelled." >&2
  label_args=""
fi

# Time order, not alphabetical.
flavors="midnight twilight dawn noon"
variants="red orange yellow green blue purple"

mkdir -p "$out"

for flavor in $flavors; do
  sheet_inputs=""
  for variant in $variants; do
    theme="vivid-life-$flavor-$variant"
    if [ ! -d "$HOME/.themes/$theme" ] && [ ! -d "/usr/share/themes/$theme" ]; then
      echo "preview:shots4 — skipped $theme: not installed (run ./install.sh)." >&2
      continue
    fi
    png="$out/gtk4-$theme.png"
    echo "capturing gtk4 $theme"
    xvfb-run -a --server-args="-screen 0 900x1280x24" sh -c "
      GTK_THEME=$theme /usr/bin/python3 '$here/gallery4.py' --theme '$theme' --screenshot '$png' &
      gallery_pid=\$!
      sleep 4
      $import_cmd -window root '$png'
      wait \$gallery_pid 2>/dev/null || true
    "
    sheet_inputs="$sheet_inputs $png"
  done

  [ -n "$sheet_inputs" ] || continue

  # Word splitting on both variables is deliberate — they are argument lists.
  # shellcheck disable=SC2086
  $montage_cmd $sheet_inputs $label_args -tile 3x -geometry '+8+8' \
    -background '#222222' -fill '#eeeeee' "$out/contact-gtk4-$flavor.png"
  echo "wrote $out/contact-gtk4-$flavor.png"
done
