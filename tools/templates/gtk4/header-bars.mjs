import { composite } from "../../lib/contrast.mjs";

export function render(ctx) {
  return `headerbar {
  background-color: @vl_bg_soft;
  color: @vl_fg;
  /* control_border, not border — the toolbar and actionbar rules below
     already use it, and this line was the odd one out. \`border.default\` is
     the value this spec's own Problem section records as failing 3:1 against
     every surface on every flavour and being *identical* to the surface in
     three cases; deriving control_border is the fix that motivated the
     phase. Against bg_soft it measures 1.00:1 on Midnight — the headerbar
     simply had no bottom edge there. */
  border-bottom: 1px solid @vl_control_border;
}

/* GtkToolbar was removed in GTK4. What remains is the .toolbar style class
   apps put on a plain box — there is no \`toolbar\` element to match, which
   is why the GTK3 rule cannot simply be copied across. */
.toolbar {
  background-color: @vl_bg_soft;
  color: @vl_fg;
  padding: ${ctx.space["1"]};
  border-bottom: 1px solid @vl_control_border;
}

actionbar > revealer > box {
  background-color: @vl_bg_soft;
  color: @vl_fg;
  padding: ${ctx.space["2"]};
  border-top: 1px solid @vl_control_border;
}

/* Chrome buttons are flat until touched: each drawing a full border would
   turn a toolbar into a grid. \`.toolbar button\` (descendant) is deliberately
   broader than upstream's \`.toolbar > button\` (direct child) plus its
   separate forms for wrapped controls — this single selector catches
   wrapped buttons too, without enumerating them. Don't narrow it to match
   upstream; that would silently drop coverage. */
.toolbar button,
button.flat {
  background-color: transparent;
  border-color: transparent;
}

.toolbar button:hover,
button.flat:hover {
  background-color: alpha(@vl_accent, 0.2);
  border-color: @vl_control_border;
}`;
}

export function contrastPairs(ctx) {
  return [
    {
      // The headerbar's own boundary was never declared — only the toolbar's
      // was — which is how it kept an ungated `border.default` while its two
      // siblings in this module moved to control_border.
      label: "headerbar boundary",
      fg: ctx.control.border,
      bg: ctx.surface.bg_soft,
      rule: "nontext",
    },
    {
      label: "headerbar title",
      fg: ctx.text.fg,
      bg: ctx.surface.bg_soft,
      rule: "text",
    },
    {
      label: "toolbar label",
      fg: ctx.text.fg,
      bg: ctx.surface.bg_soft,
      rule: "text",
    },
    {
      label: "toolbar boundary",
      fg: ctx.control.border,
      bg: ctx.surface.bg_soft,
      rule: "nontext",
    },
    {
      label: "flat button hover label",
      fg: ctx.text.fg,
      bg: composite(ctx.surface.bg_soft, `${ctx.accent}33`),
      rule: "text",
    },
  ];
}
