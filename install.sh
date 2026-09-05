#!/bin/sh
# Vivid Life Xfce installer.
# POSIX sh + coreutils only. No Node, no npm, no network access required.
set -eu

SCRIPT_DIR=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)
REPO_ROOT="$SCRIPT_DIR"
THEMES_DIR="$HOME/.themes"

ALL_FLAVORS="midnight twilight dawn noon"
ALL_VARIANTS="red orange yellow green blue purple"
ALL_TARGETS="gtk-2.0 gtk-3.0 gtk-4.0 xfwm4"

FLAVOR=""
VARIANT=""
TARGETS=""
INSTALL_ALL=0
ASSUME_YES=0
DRY_RUN=0

usage() {
	cat <<'EOF'
Usage: install.sh [OPTIONS]

Options:
  --flavor=NAME       midnight | twilight | dawn | noon
  --variant=NAME      red | orange | yellow | green | blue | purple
  --targets=LIST      comma-separated: gtk-2.0,gtk-3.0,gtk-4.0,xfwm4
                      (default: auto-detected)
  --all               install all 24 flavor/variant combinations for the
                      selected/detected targets
  -y, --yes           skip confirmation prompts (requires --flavor and
                      --variant, or --all)
  --dry-run           print what would happen without copying anything
  -h, --help          show this help
EOF
}

die() {
	echo "install.sh: $*" >&2
	exit 1
}

is_in_list() {
	needle=$1
	haystack=$2
	for item in $haystack; do
		[ "$item" = "$needle" ] && return 0
	done
	return 1
}

for arg in "$@"; do
	case "$arg" in
	--flavor=*) FLAVOR="${arg#--flavor=}" ;;
	--variant=*) VARIANT="${arg#--variant=}" ;;
	--targets=*) TARGETS=$(echo "${arg#--targets=}" | tr ',' ' ') ;;
	--all) INSTALL_ALL=1 ;;
	-y | --yes) ASSUME_YES=1 ;;
	--dry-run) DRY_RUN=1 ;;
	-h | --help)
		usage
		exit 0
		;;
	*) die "unknown option: $arg (see --help)" ;;
	esac
done

if [ -n "$FLAVOR" ] && ! is_in_list "$FLAVOR" "$ALL_FLAVORS"; then
	die "unknown flavor: $FLAVOR (expected one of: $ALL_FLAVORS)"
fi
if [ -n "$VARIANT" ] && ! is_in_list "$VARIANT" "$ALL_VARIANTS"; then
	die "unknown variant: $VARIANT (expected one of: $ALL_VARIANTS)"
fi

has_gtk_lib() {
	# Detect installed GTK runtime libraries via the linker cache. This works
	# on ordinary desktop installs, which have libgtk-*.so but rarely the
	# -dev packages that ship the pkg-config .pc files used previously.
	if command -v ldconfig >/dev/null 2>&1; then
		ldconfig -p 2>/dev/null | grep -q "$1"
	else
		pkg-config --exists "$2" 2>/dev/null
	fi
}

detect_target() {
	case "$1" in
	gtk-2.0) has_gtk_lib 'libgtk-x11-2\.0\.so' gtk+-2.0 ;;
	gtk-3.0) has_gtk_lib 'libgtk-3\.so' gtk+-3.0 ;;
	gtk-4.0) has_gtk_lib 'libgtk-4\.so' gtk4 ;;
	xfwm4) command -v xfwm4 >/dev/null 2>&1 ;;
	*) return 1 ;;
	esac
}

if [ -z "$TARGETS" ]; then
	detected=""
	# shellcheck disable=SC2086 # intentional word-splitting over a space-separated list
	for target in $ALL_TARGETS; do
		if detect_target "$target"; then
			detected="$detected $target"
		fi
	done
	TARGETS=$(echo "$detected" | sed 's/^ //')
fi

if [ -z "$TARGETS" ]; then
	echo "install.sh: could not auto-detect any of: $ALL_TARGETS" >&2
	echo "install.sh: pass --targets explicitly, e.g. --targets=gtk-3.0,xfwm4" >&2
	exit 1
fi

# shellcheck disable=SC2086 # intentional word-splitting over a space-separated list
for target in $TARGETS; do
	is_in_list "$target" "$ALL_TARGETS" || die "unknown target: $target (expected one of: $ALL_TARGETS)"
done

printf 'Detected/selected targets:'
# shellcheck disable=SC2086
for t in $TARGETS; do printf ' %s' "$t"; done
printf '\n'

prompt_choice() {
	prompt_label=$1
	choices=$2
	default=$3
	if [ "$ASSUME_YES" -eq 1 ]; then
		echo "$default"
		return
	fi
	printf '%s [%s] (default: %s): ' "$prompt_label" "$choices" "$default" >&2
	read -r answer
	if [ -z "$answer" ]; then
		echo "$default"
	else
		echo "$answer"
	fi
}

if [ "$INSTALL_ALL" -eq 0 ]; then
	if [ -z "$FLAVOR" ]; then
		FLAVOR=$(prompt_choice "Flavor" "$ALL_FLAVORS" "midnight")
		is_in_list "$FLAVOR" "$ALL_FLAVORS" || die "unknown flavor: $FLAVOR"
	fi
	if [ -z "$VARIANT" ]; then
		VARIANT=$(prompt_choice "Variant" "$ALL_VARIANTS" "purple")
		is_in_list "$VARIANT" "$ALL_VARIANTS" || die "unknown variant: $VARIANT"
	fi
fi

install_one() {
	flavor=$1
	variant=$2
	theme_name="vivid-life-${flavor}-${variant}"
	installed_any=0
	# shellcheck disable=SC2086
	for target in $TARGETS; do
		src="$REPO_ROOT/$target/$theme_name"
		if [ ! -d "$src" ]; then
			echo "install.sh: skipping $target ($theme_name): not found at $src" >&2
			continue
		fi
		dest="$THEMES_DIR/$theme_name/$target"
		if [ "$DRY_RUN" -eq 1 ]; then
			echo "[dry-run] would copy $src -> $dest"
			installed_any=1
			continue
		fi
		mkdir -p "$dest"
		cp -r "$src"/. "$dest"/
		installed_any=1
		echo "Installed $theme_name ($target) -> $dest"
	done

	# index.theme lives at the theme root, not inside a target directory.
	index_src="$REPO_ROOT/index/$theme_name/index.theme"
	if [ "$installed_any" -eq 1 ] && [ -f "$index_src" ]; then
		index_dest="$THEMES_DIR/$theme_name/index.theme"
		if [ "$DRY_RUN" -eq 1 ]; then
			echo "[dry-run] would copy $index_src -> $index_dest"
		else
			mkdir -p "$THEMES_DIR/$theme_name"
			cp "$index_src" "$index_dest"
			echo "Installed $theme_name (index.theme) -> $index_dest"
		fi
	fi
}

if [ "$INSTALL_ALL" -eq 1 ]; then
	# shellcheck disable=SC2086
	for flavor in $ALL_FLAVORS; do
		# shellcheck disable=SC2086
		for variant in $ALL_VARIANTS; do
			install_one "$flavor" "$variant"
		done
	done
else
	install_one "$FLAVOR" "$VARIANT"
fi

print_recommendations() {
	cat <<'EOF'

Icon and font recommendations (not bundled -- install separately if you'd like):

  Icons: Papirus icon theme, with per-variant folder colors via papirus-folders.
    apt:    sudo apt install papirus-icon-theme
            (papirus-folders isn't packaged for Debian/Ubuntu; install it
            from https://github.com/PapirusDevelopmentTeam/papirus-folders)
    dnf:    sudo dnf install papirus-icon-theme papirus-folders
    pacman: sudo pacman -S papirus-icon-theme papirus-folders
    Match your variant's folder color:
      red -> red   orange -> orange   yellow -> yellow
      green -> green   blue -> blue   purple -> violet
    Example: papirus-folders -C violet --theme Papirus-Dark

  Fonts: Atkinson Hyperlegible Next (UI) + Atkinson Hyperlegible Mono (code/terminal)
    Source: https://www.brailleinstitute.org/freefont (OFL-1.1)

See https://github.com/vivid-life-theme/vivid-life-design-system for details.
EOF
}

print_recommendations

echo
echo "Done. Select the theme in xfce4-appearance-settings (GTK) and"
echo "xfwm4-settings (Window Manager) if it wasn't applied automatically."
