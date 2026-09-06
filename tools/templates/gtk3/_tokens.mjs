export function render(ctx) {
  return `@define-color vl_bg ${ctx.surface.bg};
@define-color vl_bg_soft ${ctx.surface.bg_soft};
@define-color vl_bg_sunk ${ctx.surface.bg_sunk};
@define-color vl_bg_overlay ${ctx.surface.bg_overlay};
@define-color vl_fg ${ctx.text.fg};
@define-color vl_fg_muted ${ctx.text.fg_muted};
@define-color vl_fg_subtle ${ctx.text.fg_subtle};
@define-color vl_fg_disabled ${ctx.text.fg_disabled};
@define-color vl_border ${ctx.border.default};
@define-color vl_border_subtle ${ctx.border.subtle};
@define-color vl_border_strong ${ctx.border.strong};
@define-color vl_control_border ${ctx.control.border};
@define-color vl_accent ${ctx.accent};
@define-color vl_accent_on ${ctx.accentOn};
@define-color vl_selection ${ctx.state.selection};
@define-color vl_success ${ctx.semantic.success};
@define-color vl_warning ${ctx.semantic.warning};
@define-color vl_danger ${ctx.semantic.danger};
@define-color vl_info ${ctx.semantic.info};`;
}
