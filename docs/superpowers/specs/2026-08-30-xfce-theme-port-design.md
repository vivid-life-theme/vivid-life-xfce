# Vivid Life Xfce — theme port design

Date: 2026-08-30
Status: approved for planning

## Purpose

Port the Vivid Life Theme design system (`vivid-life-theme/vivid-life-design-system`) to the Xfce desktop environment: GTK2, GTK3, GTK4 widget themes plus an Xfwm4 window-manager theme, covering all 4 flavors × 6 variants (24 combinations) for each target. Ship a POSIX-shell installer that auto-detects what a user has installed and lets them pick what they need. Icons and fonts are recommended, not bundled — the installer informs users how to get them.

## Non-goals

- No icon theme is drawn or bundled. Papirus (+ `papirus-folders`) is recommended per the upstream design system's `iconography.desktop` guidance.
- No font files are bundled. Atkinson Hyperlegible Next/Mono are recommended with install instructions.
- No CI screenshot diffing or automated visual regression in v1 — verification is manual.
- No system-wide (`/usr/share/themes`) install path in v1 — user-only (`~/.themes/`).
- GTK4 support is best-effort: libadwaita apps largely ignore `gtk-4.0/gtk.css` and there is no workaround in scope here; the port ships the CSS for the apps that do read it and documents the limitation.

## Source of truth

Upstream tokens are vendored as a snapshot at `tokens/tokens.json` (pinned to a specific upstream version, re-synced manually when needed). The generator never re-derives palette or accent-shade values — it reads `palette`, `variant_hues`, `accent_shade`, and each `flavors.<flavor>.{surface,text,border,state,semantic,syntax,ansi}` block exactly as upstream defines them, per the upstream README's "For downstream ports" contract.

## Architecture

```
vivid-life-xfce/
  tokens/
    tokens.json                 vendored snapshot (+ VERSION file recording upstream version/commit)
  gtk-2.0/
    vivid-life-<flavor>-<variant>/gtkrc            (24 dirs)
  gtk-3.0/
    vivid-life-<flavor>-<variant>/gtk.css          (24 dirs)
  gtk-4.0/
    vivid-life-<flavor>-<variant>/gtk.css          (24 dirs)
  xfwm4/
    vivid-life-<flavor>-<variant>/
      theme.xml
      *.png                                          (button/frame assets per state)
  tools/
    generate.mjs                 maintainer-only: tokens.json -> all 96 generated theme dirs
    templates/
      gtkrc.tmpl.mjs
      gtk3.css.tmpl.mjs
      gtk4.css.tmpl.mjs
      xfwm4/
        *.svg                    parameterized button/frame source art (token placeholders)
        theme.xml.tmpl.mjs
  install.sh                     end-user installer, POSIX shell + coreutils only
  README.md                      usage instructions + icon/font recommendations
```

Two independent lifecycles:

- **Maintainer**: runs `node tools/generate.mjs` whenever `tokens/tokens.json` is refreshed from upstream. Commits the regenerated 96 theme directories to git. Requires Node.js and `rsvg-convert` (from `librsvg2-bin` / `librsvg`) as maintainer-only dependencies.
- **End user**: runs `install.sh`. No Node, no generator, no network access required — it only copies pre-built files already in the repo.

## Generator (`tools/generate.mjs`)

- Iterates `flavor × variant` (24 combinations). For each, resolves the accent color via `palette[variant][accent_shade[flavor][variant]]`, exactly as upstream's port contract specifies.
- **GTK3 / GTK4**: fills a CSS template using `surface.*`, `text.*`, `border.*`, `state.*`, `semantic.*` from the flavor block, plus the resolved accent for the variant. GTK4's generated `gtk.css` carries a header comment documenting the libadwaita limitation.
- **GTK2**: fills a `gtkrc` template. GTK2's config format has no variables/custom-properties, so every resolved value is inlined per generated file (`bg[NORMAL]`, `fg[NORMAL]`, `bg[SELECTED]`, `pixmap_path`, etc.).
- **Xfwm4**: renders parameterized SVG button/frame sources (close/minimize/maximize/menu, each in active/inactive/prelight/pressed states) with token colors substituted, rasterizes to PNG via `rsvg-convert` at the sizes Xfwm4 expects, and generates `theme.xml` mapping resolved colors to Xfwm4's border/title/button keys.
- `--check` flag: regenerates into a temp dir and diffs against committed output, exits non-zero on drift. Not wired into CI in v1 (no CI yet in this repo) but usable as a future pre-commit/CI gate.

## Installer (`install.sh`)

- Pure POSIX shell + coreutils (`cp`, `mkdir`, `readlink`, etc.) — no Bash-only or GNU-only extensions unless verified portable via `shellcheck`.
- **Detection**: probes `pkg-config --exists gtk+-2.0`, `gtk+-3.0`, `gtk4`, and looks for `xfwm4` on `PATH` (or via `dpkg -l`/`rpm -q` as a fallback where `pkg-config` data isn't present) to determine which targets to offer. Targets with nothing detected are skipped with a note; if nothing is detected at all, warn but still let the user proceed manually.
- **Interactive default flow**: prompts for flavor (time order: Midnight, Twilight, Dawn, Noon) then variant (Red, Orange, Yellow, Green, Blue, Purple), shows detected targets for confirmation, then installs into `~/.themes/vivid-life-<flavor>-<variant>/{gtk-2.0,gtk-3.0,gtk-4.0,xfwm4}` (only the confirmed targets).
- **Non-interactive flags**: `--flavor=<name>`, `--variant=<name>`, `--targets=gtk2,gtk3,gtk4,xfwm4` (default: auto-detected), `--all` (install all 24 combinations for the selected/detected targets), `-y`/`--yes` (skip confirmation prompts, requires `--flavor`/`--variant` or `--all`).
- **Post-install recommendations** (informational only, nothing auto-installed): prints the Papirus + `papirus-folders` recommendation with the variant→folder-color mapping taken from `tokens.json`'s `iconography.desktop.port_recipe`, and the Atkinson Hyperlegible Next/Mono font recommendation — each with a one-line install command for apt/dnf/pacman where the package is trivially named, otherwise a link to the source.

## Testing

Manual, per the project's existing "no build tooling for end users" convention:

- `shellcheck install.sh` as the automated gate (already wired into `.claude/settings.json`'s PostToolUse hook for `.sh` files).
- Visual verification is manual: install a variant, open `xfce4-appearance-settings` and `xfwm4-settings`, and eyeball against upstream's `preview/01-kitchen-sink.html` for the equivalent flavor/variant as a reference.
- No automated screenshot diffing or CI in v1.

## Open questions / future work

- Whether to add a `--check`-driven CI job once this repo has GitHub Actions doing more than Claude review/mention (out of scope now, workflows already added are review/mention only).
- Whether a `--system` (`/usr/share/themes`) install mode is worth adding later for multi-user machines.
- Whether to track upstream `tokens.json` via git submodule or npm dependency instead of a manual vendored snapshot, if re-sync frequency turns out to be high.
