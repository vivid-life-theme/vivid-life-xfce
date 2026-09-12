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
elif command -v montage >/dev/null 2>&1; then
	montage_cmd="montage"
else
	echo "preview:shots4 — skipped: ImageMagick not installed." >&2
	exit 0
fi
# /usr/bin/import explicitly, for the same reason factory.sh hardcodes it:
# the Homebrew ImageMagick earlier on PATH is built without the X11
# delegate, so its import(1) cannot grab a window and fails with a usage
# message. Only the distribution build can screenshot. The montage above
# needs no X11, so it can stay on whatever ImageMagick PATH resolves.
grab=/usr/bin/import
if [ ! -x "$grab" ]; then
	echo "preview:shots4 — skipped: $grab not found." >&2
	echo "  (Debian/Ubuntu: sudo apt install imagemagick)" >&2
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
		# GTK_THEME resolves by NAME through ~/.themes, so this harness renders
		# whatever was last installed — not the working tree. That is not a
		# theoretical risk: a full capture run was once read as evidence about
		# current work while every window actually rendered a stylesheet five
		# days stale, and the screenshots looked entirely plausible. Abort rather
		# than skip: a stale capture is worse than no capture, because it still
		# looks like evidence.
		installed="$HOME/.themes/$theme/gtk-4.0/gtk.css"
		generated="$here/../../gtk-4.0/$theme/gtk.css"
		if [ -f "$installed" ] && [ -f "$generated" ] && ! cmp -s "$installed" "$generated"; then
			echo "preview:shots4 — ABORT: $theme is installed stale." >&2
			echo "  installed: $installed" >&2
			echo "  generated: $generated" >&2
			echo "  These differ, so every capture would show the installed copy." >&2
			echo "  Run: npm run generate && ./install.sh --all" >&2
			exit 1
		fi
		png="$out/gtk4-$theme.png"
		echo "capturing gtk4 $theme"
		# The gallery holds its window open on a timeout; the subshell exits
		# with the grab's own status, so a failed capture is not masked by the
		# background gallery process being reaped afterward.
		if xvfb-run -a --server-args="-screen 0 900x1280x24" sh -c "
      GTK_THEME=$theme /usr/bin/python3 '$here/gallery4.py' --theme '$theme' --screenshot '$png' &
      gallery_pid=\$!
      sleep 4
      $grab -window root '$png'
      grab_status=\$?
      wait \$gallery_pid 2>/dev/null || true
      exit \$grab_status
    " && [ -s "$png" ]; then
			sheet_inputs="$sheet_inputs $png"
		else
			echo "preview:shots4 — capture failed for $theme; excluded from contact sheet." >&2
			rm -f "$png"
		fi
	done

	[ -n "$sheet_inputs" ] || continue

	# Word splitting on both variables is deliberate — they are argument lists.
	# shellcheck disable=SC2086
	$montage_cmd $sheet_inputs $label_args -tile 3x -geometry '+8+8' \
		-background '#222222' -fill '#eeeeee' "$out/contact-gtk4-$flavor.png"
	echo "wrote $out/contact-gtk4-$flavor.png"
done
