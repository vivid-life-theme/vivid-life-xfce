---
name: release
description: Release skill for vivid-life-xfce — bumps version, updates CHANGELOG, commits, tags, pushes, and creates a GitHub release. There is no package registry for this port; the GitHub Release is the only release surface. Use only when intentionally cutting a release.
disable-model-invocation: true
---

# Release Skill — vivid-life-xfce

This port has no package registry (GTK/xfwm4 themes are installed via `install.sh`, not a package manager). "Release" here means: a tagged commit plus a GitHub Release, so anyone opening the repo on GitHub can see there's a new version without having to `git pull` and diff themselves.

Runs the full release sequence: pre-flight → version bump → CHANGELOG update → commit → tag → push → GitHub release.

## Pre-flight

Run all checks before doing anything else. Stop and report clearly if any fail.

- Verify on `main`: `git branch --show-current` must output `main`
- Verify working tree clean: `git status --porcelain` must produce no output
- Verify generated output is in sync: `npm run check` must exit without error (it runs the generator with `--check` and fails on drift between `tokens.json5` and the committed `gtk-2.0`/`gtk-3.0`/`gtk-4.0`/`xfwm4` output)
- Verify tests pass: `npm test` must exit without error

## CHANGELOG Check

Read `CHANGELOG.md`. Locate the `## [Unreleased]` section.

If it contains no entries (only the heading and surrounding blank lines), stop:

> The `[Unreleased]` section in CHANGELOG.md is empty. Document what changed before running `/release`.

Otherwise show the user the full contents of the `[Unreleased]` section and continue.

## Version Confirmation

Read `"version"` from `package.json` and show the current value.

Show the `[Unreleased]` contents again as context.

Ask the user to confirm the new version number. Suggest the appropriate bump:

- Patch (X.Y.Z+1): bug fixes, documentation updates, color tweaks
- Minor (X.Y+1.0): new flavor, new variant, new component support (e.g. extending partial xfwm4 support), new feature in `install.sh`
- Major (X+1.0.0): breaking changes — renamed/removed theme files, changed the GTK/xfwm4 theme name or install path, or a change to `install.sh` that isn't backward compatible

If this is the first-ever release (no existing `v*` git tags — check with `git tag -l 'v*'`), the current `package.json` version may stand as-is rather than being bumped further.

Wait for the user to confirm before proceeding.

## Bump Version

Edit `package.json`: change `"version"` to the confirmed version string.

## Update CHANGELOG

Edit `CHANGELOG.md`:

1. Replace the `## [Unreleased]` heading with `## [X.Y.Z] - YYYY-MM-DD` where `YYYY-MM-DD` is today's date in ISO 8601 format
2. Insert a new `## [Unreleased]` section at the top (before the versioned entry), with a blank line after the heading

The result should look like:

```
## [Unreleased]

## [X.Y.Z] - YYYY-MM-DD

### <category>

- <entry>

```

## Commit

```bash
git add package.json CHANGELOG.md
git commit -m "🔖 chore(release): bump to vX.Y.Z

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

## Tag

```bash
git tag -a vX.Y.Z -m "Version X.Y.Z"
```

## Push

```bash
git push && git push --tags
```

## Create GitHub Release

Extract release notes from the CHANGELOG section just written:

```bash
VERSION="X.Y.Z"
awk "/^## \[${VERSION}\]/{p=1; next} p && /^## /{exit} p" CHANGELOG.md > /tmp/vl-release-notes.md
```

```bash
gh release create "v${VERSION}" \
  --title "v${VERSION}" \
  --notes-file /tmp/vl-release-notes.md
```

This is the actual publication step for this repo — there is no CI workflow or registry to wait on. The release becomes visible immediately in the repo's sidebar and to anyone watching the repo for releases.

## Confirm

Report to the user:

> Tag vX.Y.Z pushed and release published: https://github.com/vivid-life-theme/vivid-life-xfce/releases/tag/vX.Y.Z
