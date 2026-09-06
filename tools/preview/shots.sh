#!/bin/sh
# Captures the widget gallery under all 24 themes and montages one contact
# sheet per flavor, so a regression in any variant is visible side by side.
#
# Optional tooling: a fresh clone without xvfb-run or ImageMagick skips with
# a message rather than failing the checkout.
set -eu

here=$(dirname "$0")
out="$here/out"

if ! command -v xvfb-run >/dev/null 2>&1; then
  echo "preview:shots — skipped: xvfb-run not installed (package xvfb)." >&2
  exit 0
fi
if command -v magick >/dev/null 2>&1; then
  montage_cmd="magick montage"
elif command -v montage >/dev/null 2>&1; then
  montage_cmd="montage"
else
  echo "preview:shots — skipped: ImageMagick not installed." >&2
  exit 0
fi

# This ImageMagick build ships no font configuration of its own, so a bare
# -label fails with "unable to read font ''". Resolve one through fontconfig
# and drop the labels rather than the sheet if there is none.
label_args="-label %t -pointsize 18"
font=$(fc-match -f '%{file}' sans 2>/dev/null || true)
if [ -n "$font" ] && [ -f "$font" ]; then
  label_args="$label_args -font $font"
else
  echo "preview:shots — no font found; contact sheets will be unlabelled." >&2
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
      echo "preview:shots — skipped $theme: not installed (run ./install.sh)." >&2
      continue
    fi
    png="$out/$theme.png"
    echo "capturing $theme"
    xvfb-run -a env GTK_THEME="$theme" /usr/bin/python3 "$here/gallery.py" \
      --theme "$theme" --screenshot "$png"
    sheet_inputs="$sheet_inputs $png"
  done

  [ -n "$sheet_inputs" ] || continue

  # Word splitting on both variables is deliberate — they are argument lists.
  # shellcheck disable=SC2086
  $montage_cmd $sheet_inputs $label_args -tile 3x -geometry '+8+8' \
    -background '#222222' -fill '#eeeeee' "$out/contact-$flavor.png"
  echo "wrote $out/contact-$flavor.png"
done
