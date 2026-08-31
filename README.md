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

## GTK4 note

GTK4 apps built on **libadwaita** largely ignore custom `gtk-4.0/gtk.css` stylesheets and follow libadwaita's own accent-color system instead. The GTK4 theme here is shipped best-effort for the (shrinking) set of GTK4 apps that don't opt into libadwaita theming.

## Icons and fonts (not bundled)

This theme intentionally does not ship an icon set or font files — see the upstream design system's [iconography guidance](https://github.com/vivid-life-theme/vivid-life-design-system#iconography). `install.sh` prints these recommendations after installing:

- **Icons:** [Papirus](https://github.com/PapirusDevelopmentTeam/papirus-icon-theme) + [`papirus-folders`](https://github.com/PapirusDevelopmentTeam/papirus-folders) to tint folder icons to match your variant.
- **Fonts:** [Atkinson Hyperlegible Next](https://www.brailleinstitute.org/freefont) (UI) and Atkinson Hyperlegible Mono (code/terminal), OFL-1.1 licensed.

## For maintainers: regenerating themes

Theme files under `gtk-2.0/`, `gtk-3.0/`, `gtk-4.0/`, and `xfwm4/` are generated from `@vivid-life-theme/design-system` tokens — never hand-edited. To pick up an upstream design-system update:

```sh
npm install @vivid-life-theme/design-system@<new-version>
npm run generate
npm run check   # confirms committed output matches the tokens
npm test        # runs the generator/template unit tests
git add -A
git commit -m "chore: sync theme output with design-system <new-version>"
```

Requires Node.js >=20 and `rsvg-convert` (`librsvg2-bin` / `librsvg2-tools` / `librsvg`) — maintainer-only; end users never need either.

## Repository layout

```text
gtk-2.0/, gtk-3.0/, gtk-4.0/, xfwm4/   generated theme output (24 dirs each)
tools/                                  generator (Node.js, maintainer-only)
install.sh                              end-user installer (POSIX sh)
docs/superpowers/specs/                 design spec for this port
docs/superpowers/plans/                 implementation plan for this port
```

## License

MIT — see [LICENSE](LICENSE). Fonts recommended above are separately licensed (OFL-1.1) and not distributed here.
