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

# A failed grab still writes a small, valid, entirely blank PNG. shots2.sh and
# shots4.sh both gained this check after a 24-theme sweep reported exit 0 with
# every capture blank; factory.sh was rewritten on the same branch and did not.
not_blank() {
	[ -s "$1" ] || return 1
	colours=$(identify -format '%k' "$1" 2>/dev/null || echo 1)
	[ "$colours" -gt 16 ]
}

# GTK_THEME resolves by NAME through ~/.themes, so this harness renders
# whatever was last installed rather than the working tree. A full capture run
# was once read as evidence about current work while every window actually
# rendered a stylesheet five days stale. Abort rather than skip — a stale
# capture is worse than no capture, because it still looks like evidence.

# Only the targets whose pass will actually run. Checking gtk-4.0
# unconditionally aborts on a machine with no GTK4 — install.sh auto-detects by
# libgtk-4.so and installs no gtk-4.0 theme there, and gtk4-widget-factory is
# absent for the same reason — which would make the GTK4 skip path below
# unreachable and tell the user to run `./install.sh --all`, installing a GTK4
# theme on a machine with no GTK4. A guard has to fail on the runs it guards,
# not on the ones that were never going to happen.
targets="gtk-3.0"
if command -v gtk4-widget-factory >/dev/null 2>&1; then
	targets="$targets gtk-4.0"
fi

for theme in $themes; do
	for target in $targets; do
		# ~/.themes first, matching GTK's lookup precedence, then the system
		# directory — otherwise a theme installed only under /usr/share is
		# reported "not installed" while GTK_THEME would load it perfectly well.
		if [ -f "$HOME/.themes/$theme/$target/gtk.css" ]; then
			installed="$HOME/.themes/$theme/$target/gtk.css"
		else
			installed="/usr/share/themes/$theme/$target/gtk.css"
		fi
		generated="$here/../../$target/$theme/gtk.css"
		# The missing-install case must abort too, not slip past. GTK_THEME
		# naming a theme GTK cannot resolve does not fail: GTK falls back to
		# its built-in default and the capture succeeds, writing a perfectly
		# plausible factory-vivid-life-<name>.png of the wrong theme. Reachable
		# on a fresh clone that never ran install.sh, or after an
		# ./install.sh --targets=… run that omitted this target.
		if [ ! -f "$installed" ]; then
			echo "preview:factory — ABORT: $theme/$target is not installed." >&2
			echo "  GTK_THEME would silently fall back to the default theme." >&2
			echo "  Run: npm run generate && ./install.sh --all" >&2
			exit 1
		fi
		# A missing generated file would make the comparison below no-op, which
		# is the same can't-fire shape as the guards this phase already had to
		# repair. Unreachable while the output is committed; cheap to close.
		if [ ! -f "$generated" ]; then
			echo "preview:factory — ABORT: $generated does not exist." >&2
			echo "  Nothing to compare the install against. Run: npm run generate" >&2
			exit 1
		fi
		if ! cmp -s "$installed" "$generated"; then
			echo "preview:factory — ABORT: $theme/$target is installed stale." >&2
			echo "  installed: $installed" >&2
			echo "  generated: $generated" >&2
			echo "  Run: npm run generate && ./install.sh --all" >&2
			exit 1
		fi
	done
done

for theme in $themes; do
	png="$out/factory-$theme.png"
	echo "capturing factory under $theme"
	# The factory has no --screenshot flag, so grab the root window after
	# giving it time to map. import(1) targets the X display, not a window id.
	if xvfb-run -a --server-args="-screen 0 1280x1600x24" sh -c "
    GTK_THEME=$theme gtk3-widget-factory &
    factory_pid=\$!
    sleep 4
    $grab -window root '$png'
    grab_status=\$?
    kill \$factory_pid 2>/dev/null || true
    exit \$grab_status
  " && not_blank "$png"; then
		echo "wrote $png"
	else
		echo "preview:factory — capture FAILED for $theme (gtk3)." >&2
		rm -f "$png"
		exit 1
	fi
done

if command -v gtk4-widget-factory >/dev/null 2>&1; then
	for theme in $themes; do
		png="$out/factory4-$theme.png"
		echo "capturing gtk4 factory under $theme"
		if xvfb-run -a --server-args="-screen 0 1280x1600x24" sh -c "
      GTK_THEME=$theme gtk4-widget-factory &
      factory_pid=\$!
      sleep 4
      $grab -window root '$png'
      grab_status=\$?
      kill \$factory_pid 2>/dev/null || true
      exit \$grab_status
    " && not_blank "$png"; then
			echo "wrote $png"
		else
			echo "preview:factory — capture FAILED for $theme (gtk4)." >&2
			rm -f "$png"
			exit 1
		fi
	done
else
	echo "preview:factory — gtk4-widget-factory not installed, GTK4 pass skipped" >&2
	echo "  (Debian/Ubuntu: sudo apt install gtk-4-examples)" >&2
fi
