# Vivid Life Xfce

Desktop theme port of the Vivid Life design system for Xfce: GTK2, GTK3, GTK4, and Xfwm4 themes across 4 flavors × 6 variants, plus an install script with environment auto-detection. Bash/POSIX shell, no build tooling.

## Key Config Files

| File                                       | Purpose                                       |
| ------------------------------------------ | --------------------------------------------- |
| `.claude/learnings.md`                     | TODO: add description                         |
| `CLAUDE.md`                                | Project instructions, loaded every message    |
| `.claude/settings.json`                    | TODO: add description                         |
| `.claude/skills/vivid-life-theme/SKILL.md` | TODO: add description                         |
| `.githooks/pre-commit`                     | TODO: add description                         |
| `.github/workflows/claude-code-review.yml` | TODO: add description                         |
| `.github/workflows/claude.yml`             | TODO: add description                         |
| `.gitignore`                               | Git ignore patterns                           |
| `package.json`                             | TODO: add description                         |
| `scripts/sync-config-table.sh`             | Rebuilds the Key Config Files table from disk |

<!-- cc-config: last-optimize-run: 2026-08-30 02a37ac337b99fa1c4fe1aa10a91b4f6a7bba6c6 -->

## Commands

No build tooling yet — this is a shell-script + theme-asset repo.

- Lint the installer: `shellcheck install.sh` (TODO once `install.sh` exists)
- Format shell scripts: `shfmt -w '*.sh'` (TODO)

## Structure

- `gtk-2.0/`, `gtk-3.0/`, `gtk-4.0/`, `xfwm4/` — per-target theme directories, one subfolder per flavor/variant combination (TODO: finalize naming once the first theme port lands)
- `install.sh` — interactive/auto-detecting installer (TODO: not yet created)

## Skills

- `vivid-life-theme` (`.claude/skills/vivid-life-theme/SKILL.md`) — fetches the upstream design-system tokens (`vivid-life-theme/vivid-life-design-system`) and defines Pattern B (theme port) as the build approach for this repo. Read it before generating or editing any theme files.

## Conventions

- Never hand-encode the palette — pull `tokens.json`/`dist/tokens.js` from the design-system repo (or its local mount) per the `vivid-life-theme` skill, and map tokens into GTK/Xfwm4 formats.
- Flavor names: Midnight, Twilight, Dawn, Noon (time order, not alphabetical). Variant names: Red, Orange, Yellow, Green, Blue, Purple — capitalized, no Cyan.
- Icons and fonts are recommendations only (from `vivid-life-design-system`) and are never bundled in this repo's theme output.
- All 24 flavor × variant combinations must stay WCAG AA — don't bypass the design system's accent-shade table.

## Don't

- Don't commit secrets or credentials to git
- Don't use `--force` flags — fix the underlying issue instead
- Don't hardcode hex colors in theme files where a design-system token exists
- Don't bundle icons or fonts in this repo — link to `vivid-life-design-system`'s recommendations instead

## Learnings

When the user corrects a mistake or points out a recurring issue, append a one-line
summary to .claude/learnings.md. Don't modify CLAUDE.md directly.

## Compact Instructions

When compacting, preserve: list of modified files, current test status, open TODOs, and key decisions made.
