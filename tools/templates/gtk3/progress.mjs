export function render(ctx) {
  return `progressbar > trough {
  background-color: @vl_bg_sunk;
  border-radius: ${ctx.radius.sm};
}

progressbar > trough > progress {
  background-color: @vl_accent;
  border-radius: ${ctx.radius.sm};
}

/* A levelbar drew nothing at all: GTK gives trough and block no default
   paint, so with no rule the widget is an empty box the height of a line. */
levelbar trough {
  background-color: @vl_bg_sunk;
  border: 1px solid @vl_control_border;
  border-radius: ${ctx.radius.sm};
  min-height: ${ctx.space["2"]};
}

/* \`block:not(.empty)\`, NOT \`block.filled\`: there is no .filled class in
   GTK3 (nor in GTK4) — this rule matched nothing from phase 3 until phase 5,
   so a mid-range level bar drew no fill at all while the 15 and 90 bars in
   the review looked right via .low and .high. GTK3's own Adwaita uses
   exactly this form. It stays BEFORE .low/.high/.full, which share its
   (0,1,1) specificity, so a block that is both filled and high reads as
   high by source order. */
levelbar block:not(.empty) {
  background-color: @vl_accent;
  border-radius: ${ctx.radius.sm};
}

/* GTK's built-in offsets: below "low" and at/above "high". Semantic rather
   than accent, because a level crossing a threshold is the one piece of
   information a level bar carries. */
levelbar block.low {
  background-color: @vl_warning;
}

levelbar block.high,
levelbar block.full {
  background-color: @vl_success;
}

levelbar block.empty {
  background-color: transparent;
}

/* A theme replaces Adwaita wholesale, and Adwaita is what makes a spinner
   visible at all: the glyph comes from -gtk-icon-source, visibility from an
   opacity toggle on :checked (GTK sets :checked while spinning), and the
   spin from a top-level @keyframes block. Colour and size alone — which is
   all this rule had from phase 3 until phase 5 — rendered an invisible box.
   Same fix as gtk4/progress.mjs, where it is capture-verified; GTK3's own
   sheet defines the spinner identically save for the keyframes property. process-working-symbolic is in
   GTK's own icons/, so naming it adds no icon dependency. */
@keyframes spin {
  to {
    /* -gtk-icon-transform, not transform: GTK3's CSS engine has no
       \`transform\` property at all and rejects the GTK4 form with "No
       property named 'transform'", which would leave the spinner visible
       but static. This is the one line that differs from gtk4/progress.mjs;
       GTK3's own Adwaita writes exactly this. */
    -gtk-icon-transform: rotate(1turn);
  }
}

spinner {
  color: @vl_accent;
  min-width: ${ctx.space["4"]};
  min-height: ${ctx.space["4"]};
  background: none;
  opacity: 0;
  -gtk-icon-source: -gtk-icontheme("process-working-symbolic");
}

spinner:checked {
  opacity: 1;
  animation: spin 1s linear infinite;
}

spinner:checked:disabled {
  opacity: 0.5;
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
