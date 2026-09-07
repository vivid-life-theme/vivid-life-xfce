# Vivid Life Xfce

A port of the [Vivid Life Theme](https://github.com/vivid-life-theme/vivid-life-design-system) design system to Xfce: GTK2, GTK3, GTK4, and Xfwm4 themes across 4 flavors (Midnight, Twilight, Dawn, Noon) × 6 variants (Red, Orange, Yellow, Green, Blue, Purple) — 24 combinations total, per GTK/window-manager target.

## Install

```sh
git clone https://github.com/vivid-life-theme/vivid-life-xfce.git
cd vivid-life-xfce
./install.sh
```

`install.sh` auto-detects which of GTK2, GTK3, GTK4, and Xfwm4 you have installed and only offers to install matching targets. It prompts for a flavor and variant, then copies the theme into `~/.themes/`.

Non-interactive install:

```sh
./install.sh --flavor=midnight --variant=purple --targets=gtk-3.0,xfwm4 -y
```

Install every combination (all 24) for the detected targets:

```sh
./install.sh --all -y
```

Preview what would happen without copying anything:

```sh
./install.sh --dry-run
```

Run `./install.sh --help` for the full option list.

After installing, select the theme in **Settings → Appearance** (GTK) and **Settings → Window Manager** (Xfwm4).

## Xfwm4 note: rounded corners need a compositor

Window frames use 8px rounded top corners. Xfwm4 has no alpha channel without compositing, so on a system with the compositor disabled those corners render as opaque wedges rather than transparent curves. Xfce 4.18 enables its compositor by default (**Settings → Window Manager Tweaks → Compositor**), so this affects only setups that have deliberately turned it off.

## GTK4 note

GTK4 apps built on **libadwaita** largely ignore custom `gtk-4.0/gtk.css` stylesheets and follow libadwaita's own accent-color system instead. The GTK4 theme here is shipped best-effort for the (shrinking) set of GTK4 apps that don't opt into libadwaita theming.

## Icons and fonts (not bundled)

This theme intentionally does not ship an icon set or font files — see the upstream design system's [iconography guidance](https://github.com/vivid-life-theme/vivid-life-design-system#iconography). `install.sh` prints these recommendations after installing:

- **Icons:** [Papirus](https://github.com/PapirusDevelopmentTeam/papirus-icon-theme) + [`papirus-folders`](https://github.com/PapirusDevelopmentTeam/papirus-folders) to tint folder icons to match your variant.
- **Fonts:** [Atkinson Hyperlegible Next](https://www.brailleinstitute.org/freefont) (UI) and Atkinson Hyperlegible Mono (code/terminal), OFL-1.1 licensed.

## For maintainers: regenerating themes

Theme files under `gtk-2.0/`, `gtk-3.0/`, `gtk-4.0/`, `xfwm4/`, and `index/` are generated from `@vivid-life-theme/design-system` tokens — never hand-edited. Window-button glyphs are read from that package's `assets/glyphs/` at generate time, so a new glyph must land upstream and be released before it can be used here.

After cloning — and after any pull that moves the design-system pin in `package.json` — install the pinned dependencies before running anything:

```sh
npm ci
```

Skipping this is the most likely reason `npm test` or `npm run check` fails on a tree that is otherwise correct. A stale `node_modules` missing a glyph the templates ask for fails with `Glyph "<name>" is not in the design system's assets/glyphs/`, which reads like a missing upstream release but is really just an uninstalled one.

To pick up an upstream design-system update:

```sh
npm install --save-exact @vivid-life-theme/design-system@<new-version>
npm run generate
npm run check   # confirms committed output matches the tokens
npm test        # runs the generator/template unit tests
git add -A
git commit -m "chore: sync theme output with design-system <new-version>"
```

`xfwm4/assets.manifest` records a SHA-256 of each PNG's SVG source. `npm run check` compares that manifest and every text asset byte-for-byte, and checks only that the PNGs exist, are valid PNGs, and have the expected dimensions — PNG bytes are not portable across librsvg versions, so comparing them would report false drift on any machine whose rasteriser differs. For the same reason `npm run generate` re-rasterises a PNG only when its source hash changes; use `node tools/generate.mjs --force-raster` to rebuild every PNG unconditionally.

Requires Node.js >=20 and `rsvg-convert` (`librsvg2-bin` / `librsvg2-tools` / `librsvg`) — maintainer-only; end users never need either.

### Optional preview tooling

`npm run preview` opens a gallery of every themed GTK3 widget in one window.
`npm run preview:shots` renders it under all 24 themes and montages one
contact sheet per flavor; `npm run preview:factory` does the same for
`gtk3-widget-factory`, which is upstream's own widget checklist and so
catches gaps in the gallery itself. Output lands in `tools/preview/out/`,
which is gitignored.

```sh
sudo apt install xvfb imagemagick gtk-3-examples
```

All three scripts skip with a message when a tool is missing, so a fresh
clone never fails on them. Two paths are hardcoded to the distribution
build on purpose: `/usr/bin/python3`, because a Homebrew python3 earlier on
`PATH` has no `gi` module, and `/usr/bin/import`, because a Homebrew
ImageMagick is built without the X11 delegate and cannot grab a window.

## Repository layout

```text
gtk-2.0/, gtk-3.0/, gtk-4.0/, xfwm4/   generated theme output (24 dirs each)
index/                                  generated index.theme per combination (24 dirs)
xfwm4/assets.manifest                   SHA-256 of each PNG's SVG source
tools/                                  generator (Node.js, maintainer-only)
install.sh                              end-user installer (POSIX sh)
docs/superpowers/specs/                 design specs for this port
docs/superpowers/plans/                 implementation plans for this port
```

## License

MIT — see [LICENSE](LICENSE). Fonts recommended above are separately licensed (OFL-1.1) and not distributed here.
