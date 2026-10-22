import { contrastRatio, parseCssColor } from '@tgmc/theme';

/** Brand role edited in Style Studio. */
export type BrandRole = 'primary' | 'secondary' | 'accent';

/** One WCAG check: rounded ratio, the minimum it must reach, and whether it does. */
export type RoleCheck = { ratio: number; min: number; pass: boolean };

const ratioOf = (a: string, b: string): number => {
  const fa = parseCssColor(a);
  const fb = parseCssColor(b);
  return fa && fb ? contrastRatio(fa, fb) : 1;
};

const check = (ratio: number, min: number): RoleCheck => ({
  ratio: Math.round(ratio * 100) / 100,
  min,
  pass: ratio >= min,
});

/**
 * Style Studio contrast guard for a brand role colour: the role as a mark on the page background
 * (active underline, borders, chips) — 3:1. Text links use the theme's `--theme-link-color`, and
 * button labels sit on the built `--theme-primary-fill-color` (see `studioReadout`), so no role
 * needs 4.5:1 here.
 */
export function evaluateRoleContrast(hex: string, pageBackground: string): RoleCheck {
  return check(ratioOf(hex, pageBackground), 3);
}
