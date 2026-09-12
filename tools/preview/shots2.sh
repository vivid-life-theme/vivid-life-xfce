#!/bin/sh
# Captures the GTK2 gallery under all 24 themes and montages one contact
# sheet per flavor, mirroring shots4.sh for the GTK4 gallery.
#
# Optional tooling: skips with a message rather than failing a fresh clone.
set -eu

here=$(dirname "$0")
out="$here/out"

if ! /usr/bin/python3 -c "import gi; gi.require_version('Gtk','2.0')" 2>/dev/null; then
	echo "preview:shots2 — skipped: GTK2 GObject bindings not installed." >&2
	echo "  (Debian/Ubuntu: sudo apt install gir1.2-gtk-2.0)" >&2
	exit 0
fi
if ! command -v xvfb-run >/dev/null 2>&1; then
	echo "preview:shots2 — skipped: xvfb-run not installed (package xvfb)." >&2
	exit 0
fi
if command -v magick >/dev/null 2>&1; then
	montage_cmd="magick montage"
elif command -v montage >/dev/null 2>&1; then
	montage_cmd="montage"
else
	echo "preview:shots2 — skipped: ImageMagick not installed." >&2
	exit 0
fi
# /usr/bin/import explicitly, for the same reason shots4.sh and factory.sh
# hardcode it: the Homebrew ImageMagick earlier on PATH is built without the
# X11 delegate, so its import(1) cannot grab a window.
grab=/usr/bin/import
if [ ! -x "$grab" ]; then
	echo "preview:shots2 — skipped: $grab not found." >&2
	echo "  (Debian/Ubuntu: sudo apt install imagemagick)" >&2
	exit 0
fi

label_args="-label %t -pointsize 18"
font=$(fc-match -f '%{file}' sans 2>/dev/null || true)
if [ -n "$font" ] && [ -f "$font" ]; then
	label_args="$label_args -font $font"
else
	echo "preview:shots2 — no font found; contact sheets will be unlabelled." >&2
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
		rc="$HOME/.themes/$theme/gtk-2.0/gtkrc"
		if [ ! -f "$rc" ]; then
			echo "preview:shots2 — skipped $theme: not installed (run ./install.sh)." >&2
			continue
		fi
		# Same guard as shots4.sh, for the same reason: a capture run was once
		# read as evidence while every window rendered a stylesheet five days
		# stale. Abort rather than skip — a stale capture still looks like
		# evidence. GTK2 selects by file rather than by name, so this also
		# documents which file is actually being rendered.
		generated="$here/../../gtk-2.0/$theme/gtkrc"
		if [ -f "$generated" ] && ! cmp -s "$rc" "$generated"; then
			echo "preview:shots2 — ABORT: $theme is installed stale." >&2
			echo "  installed: $rc" >&2
			echo "  generated: $generated" >&2
			echo "  Run: npm run generate && ./install.sh --all" >&2
			exit 1
		fi

		png="$out/gtk2-$theme.png"
		echo "capturing gtk2 $theme"
		if xvfb-run -a --server-args="-screen 0 760x820x24" sh -c "
      GTK2_RC_FILES='$rc' /usr/bin/python3 '$here/gallery2.py' \
        --theme '$theme' --screenshot '$png' &
      gallery_pid=\$!
      sleep 4
      $grab -window root '$png'
      grab_status=\$?
      wait \$gallery_pid 2>/dev/null || true
      exit \$grab_status
    " && [ -s "$png" ]; then
			sheet_inputs="$sheet_inputs $png"
		else
			echo "preview:shots2 — capture FAILED for $theme; excluded from sheet." >&2
			rm -f "$png"
		fi
	done

	if [ -n "$sheet_inputs" ]; then
		sheet="$out/contact-gtk2-$flavor.png"
		# shellcheck disable=SC2086
		$montage_cmd $sheet_inputs $label_args -tile 3x -geometry +8+8 "$sheet"
		echo "wrote $sheet"
	fi
done
