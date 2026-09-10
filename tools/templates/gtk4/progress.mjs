export function render(ctx) {
  return `progressbar > trough {
  background-color: @vl_bg_sunk;
  border-radius: ${ctx.radius.sm};
}

progressbar > trough > progress {
  background-color: @vl_accent;
  border-radius: ${ctx.radius.sm};
}

/* GTK4 nests block inside trough. GTK gives neither any default paint, so
   with no rule a level bar is an empty box the height of a line. */
levelbar > trough {
  background-color: @vl_bg_sunk;
  border: 1px solid @vl_control_border;
  border-radius: ${ctx.radius.sm};
  min-height: ${ctx.space["2"]};
}

/* The filled state is \`block:not(.empty)\`, NOT \`block.filled\` — there is no
   .filled class in GTK4, nor in GTK3. Verified against GTK4's own
   stylesheet, which uses \`block:not(.empty)\` for exactly this. (The GTK3
   module in this repo carries the .filled mistake; recorded as a finding
   for the next plan, out of scope here.)

   This rule comes BEFORE .low/.high/.full deliberately: those are the same
   specificity (0,1,1), so source order decides, and a block that is both
   filled and high should read as high. */
levelbar > trough > block:not(.empty) {
  background-color: @vl_accent;
  border-radius: ${ctx.radius.sm};
}

/* GTK's built-in offsets: below "low" and at/above "high". Semantic rather
   than accent, because a level crossing a threshold is the one piece of
   information a level bar carries. */
levelbar > trough > block.low {
  background-color: @vl_warning;
}

levelbar > trough > block.high,
levelbar > trough > block.full {
  background-color: @vl_success;
}

levelbar > trough > block.empty {
  background-color: transparent;
}

spinner {
  color: @vl_accent;
  min-width: ${ctx.space["4"]};
  min-height: ${ctx.space["4"]};
}`;
}

export function contrastPairs(ctx) {
  return [
    {
      label: "progress fill against its trough",
      fg: ctx.accent,
      bg: ctx.surface.bg_sunk,
      rule: "nontext",
    },
    {
      label: "levelbar filled block",
      fg: ctx.accent,
      bg: ctx.surface.bg_sunk,
      rule: "nontext",
    },
    {
      label: "levelbar low block",
      fg: ctx.semantic.warning,
      bg: ctx.surface.bg_sunk,
      rule: "nontext",
    },
    {
      label: "levelbar high block",
      fg: ctx.semantic.success,
      bg: ctx.surface.bg_sunk,
      rule: "nontext",
    },
    {
      label: "levelbar trough boundary",
      fg: ctx.control.border,
      bg: ctx.surface.bg,
      rule: "nontext",
    },
    { label: "spinner", fg: ctx.accent, bg: ctx.surface.bg, rule: "nontext" },
  ];
}
