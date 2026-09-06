#!/bin/sh
# Captures gtk3-widget-factory under a few themes. The factory is upstream's
# own widget checklist — it renders nodes our gallery does not, so it is the
# cross-check that says whether the gallery itself has a coverage gap.
#
# Optional tooling: skips with a message rather than failing a fresh clone.
set -eu

here=$(dirname "$0")
out="$here/out"

if ! command -v gtk3-widget-factory >/dev/null 2>&1; then
  echo "preview:factory — skipped: gtk3-widget-factory not installed" >&2
  echo "  (Debian/Ubuntu: sudo apt install gtk-3-examples)" >&2
  exit 0
fi
if ! command -v xvfb-run >/dev/null 2>&1; then
  echo "preview:factory — skipped: xvfb-run not installed (package xvfb)." >&2
  exit 0
fi
# /usr/bin/import explicitly, for the same reason the gallery hardcodes
# /usr/bin/python3: the Homebrew ImageMagick earlier on PATH is built
# without the X11 delegate, so its import(1) cannot grab a window and fails
# with a usage message. Only the distribution build can screenshot.
grab=/usr/bin/import
if [ ! -x "$grab" ]; then
  echo "preview:factory — skipped: $grab not found." >&2
  echo "  (Debian/Ubuntu: sudo apt install imagemagick)" >&2
  exit 0
fi

# One dark and one light flavor is enough: the factory is a completeness
# check, not a per-variant colour review. shots.sh covers all 24.
themes="vivid-life-midnight-blue vivid-life-noon-red"

mkdir -p "$out"

for theme in $themes; do
  png="$out/factory-$theme.png"
  echo "capturing factory under $theme"
  # The factory has no --screenshot flag, so grab the root window after
  # giving it time to map. import(1) targets the X display, not a window id.
  xvfb-run -a --server-args="-screen 0 1280x1600x24" sh -c "
    GTK_THEME=$theme gtk3-widget-factory &
    factory_pid=\$!
    sleep 4
    $grab -window root '$png'
    kill \$factory_pid 2>/dev/null || true
  "
  echo "wrote $png"
done
