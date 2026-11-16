---
name: vivid-life-theme
description: Use this skill to design or build artifacts (slides, prototypes, websites, app mocks) using the Vivid Life Theme — a multi-flavor color-scheme system with 4 flavors × 6 variants = 24 themes, plus type, spacing, and component foundations. All values are WCAG AA verified.
---

# Vivid Life Theme — designer's skill

Fetch the foundation data, then produce the artifact.

## What this is

A **foundation** for theming. Not itself a theme for any one app. Whatever you build (slide deck, marketing site, app mock, throwaway prototype, production code) should consume the tokens defined here.

## Step 1 — Fetch foundation data

Fetch these two files before producing anything:

1. **Token data** — the machine-readable contract (palette, flavors, variants, syntax map, typography, spacing, radii, shadows, motion): `https://raw.githubusercontent.com/vivid-life-theme/vivid-life-design-system/main/tokens.json`

2. **System overview** — architecture, naming conventions, downstream-ports guide: `https://raw.githubusercontent.com/vivid-life-theme/vivid-life-design-system/main/README.md`

If the foundation is already mounted locally (npm dep, git submodule, or copied snapshot), read `<foundation-path>/tokens.json` and `<foundation-path>/README.md` instead of fetching remotely. To install via npm:

```bash
npm install @vivid-life-theme/design-system
```

## Step 2 — Build using one of three patterns

### Pattern A — Static visual artifact (slides, marketing, throwaway)

1. Copy `colors_and_type.css` + `fonts/` + `assets/` into your output.
2. In HTML: `<link rel="stylesheet" href="colors_and_type.css">` and `<body class="vl-<flavor> variant-<variant>">`.
3. Use `var(--vl-bg)`, `var(--vl-fg)`, `var(--vl-accent)`, etc. exclusively. **Do not hardcode colors.** If you need a value not in the foundation, open it as a question — the foundation may have a gap.
4. For brand surface: use `assets/logo.svg` (or a PNG render); use `assets/wordmark.svg` for headers.

### Pattern B — Theme port (VS Code, terminal, GTK, …)

1. Read `dist/tokens.js` (or `tokens.json`). Do not re-encode the palette.
2. Iterate `flavor × variant`. The accent is `palette[variant][accent_shade[flavor][variant]]`.
3. Map foundation tokens into your target format. Use `syntax_tokens.extended` for fallback resolution.
4. For anything behind text (selection, current line, find match, word highlight, diff), read `flavors[flavor].overlay[variant][name]` — `color` + `alpha` if the target blends, `flat` if it doesn't, and `border` where there is one (both find-match overlays have one). For a terminal selection, use `overlay[variant].selection.terminal` (and `inactive_selection.terminal`): `flat` as the selection background, `foreground` as the selection foreground. For another surface, use `resolveOverlay(tokens, flavor, variant, name, { surface })`.
5. For a shell or prompt port, iterate `shell_roles.roles` / `prompt_roles.roles` and write every fish variable, PSReadLine key or Starship setting each role lists. Resolve targets with `resolveColor(tokens, flavor, variant, target, { surface: 'bg_terminal' })`.
6. For an app that draws its own chrome inside a terminal (Claude Code, a TUI, a chat client), map your token names onto `app_roles.roles`, `app_roles.mode_hues` and `app_roles.categorical[flavor]`, and resolve the same way. A spinner's highlight is `emphasis.<the role's color>`; text on an accent fill is `accent_on`; a faint hint is `fg_faint`. The name mapping is the only thing the port owns.
7. Write one file per theme to your port's output dir.
8. See README's "For downstream ports" section.

### Pattern C — Production app design

1. Pull `colors_and_type.css` into your app's CSS pipeline.
2. Toggle flavor + variant via two classes on `<html>` or `<body>`.
3. Persist user choice in `localStorage`; default to Midnight + Purple.
4. Refer to `preview/01-kitchen-sink.html` for the canonical look of every component state (buttons, inputs, toasts, tabs, modal, app chrome).

## Brand voice (light)

The theme system itself is named, structured, and described in plain, unhyped language. No emoji. No corporate boilerplate. Examples:

- Theme names use the time-of-day metaphor: **Midnight · Twilight · Dawn · Noon**. Don't invent new flavor names without strong reason.
- When listing the four flavors, keep them in time order (Midnight first or last; never alphabetical).
- Capitalize variant names: **Red · Orange · Yellow · Green · Blue · Purple**. Cyan is _not_ a variant.

## If the user invokes this skill without further guidance

Ask: "What are you building — a static artifact, a theme port, or a production-app surface?" Then ask: "Which flavor and variant should be the default?" Then build accordingly using the patterns above.

## Hard rules

- All 24 (flavor × variant) themes must remain WCAG AA. Don't bypass the accent-shade table.
- Don't introduce a serif face. Atkinson Hyperlegible has none.
- Don't use cyan as a variant. It exists only for ANSI cyan / diff hunk headers / similar protocol uses.
- Don't draw the brand mark by hand. Copy `assets/logo.svg`.
- Don't hardcode hex values where a token exists.
- Don't outline an interactive control with `border.default` or `border.strong` — neither clears the 3:1 WCAG 1.4.11 asks of a component boundary (on some flavors `border.default` is the same hex as the surface behind it). Use `border.control`, keep `bg_soft` as the fill, and on the frame (`--vl-frame`) give the control a `bg_soft` fill instead of a lighter border.
- Don't let the selected-item wash (`--vl-state-selected`) be the only cue for "this tab / row is selected" — it's too light to clear WCAG 1.4.11 on its own. Pair it with an underline or accent bar. Keep the selected label at `fg` (not `fg_muted`), and only put the wash on a surface in `overlay.roles.selected.surfaces` or on the frame (`resolveOverlay(…, 'selected', { surface: 'frame' })`). On the frame, the accent bar beside the wash is `--vl-frame-accent-text`, not `--vl-accent`.
- Don't put `fg_subtle` or the plain accent as text on the frame (`--vl-frame`): use `fg` / `fg_muted`, and `--vl-frame-accent-text` for accent-hued text. `fg_subtle` falls below 4.5:1 on Midnight's frames.
- Don't keep a port-side alpha table or blend the accent over `bg` yourself for selection, find matches, word highlights or diff backgrounds. The foundation's `overlay` recipes are gated: every syntax colour stays at 4.5:1 on them, except on the dark flavors' selections, which are deliberately a 3:1 accent tint. Read the recipe; don't rebuild it. Every wash a port needs has a role (README → Port-side washes and gate classes): map your keys onto it and use `hexa` or `flat`.
- Don't leave a terminal's selection foreground unset when the target has one. The ANSI colours aren't readable on the selection; selected text is redrawn in `selection.terminal.foreground`. If the target can't set it, say so in the port's README.
- Don't drop the `find_match_other` border. On the Yellow variant the selection and the find highlights share a hue, and the border is what keeps them apart.
- Don't re-decide what colour a shell concept (option flag, argument, variable …), a prompt segment (git status, success character, language module) or an app's chrome (mode indicator, spinner highlight, named colour, message block) takes. Read it from `shell_roles` / `prompt_roles` / `app_roles`; if a concept you need is missing, that's a foundation gap.
- Don't compute text-on-accent with `readableOn(accent)` or by flavor type yourself. Read `accent_on`; it is the gated value.
- Don't use `fg_faint` for text anyone has to read. It is a 3:1 value for rules, separators and incidental hints.

## Feedback

After producing an artifact, ask the user: "Did the result use the foundation correctly? If not, tell me what's off — I'll log it to `.claude/learnings.md` so the next session doesn't repeat it." If they flag a gap that's actually a foundation gap (a missing token, an underspecified pattern), open it as an issue against the foundation repo rather than papering over it on the port side.
