/**
 * Style Studio's contrast readout, as pure functions: what the page paints (resolved through a
 * colour resolver — in the app `resolveCssColorToHex`, which paints a pixel) and the checks the
 * readout shows. The readout judges the painted colours: the active variation
 * `--theme-<role>-color` (the pick lightness-moved to 3:1 on this mode's paper), the page
 * `--theme-main-background-color`, and the primary button `--theme-button-fill-color` under
 * `--theme-button-fg-color`.
 */
import { Color } from '@tgmc/theme';

import { evaluateRoleContrast, type BrandRole, type RoleCheck } from './contrast-guard';

/** Shown until the page is read (SSR, no canvas): the default dark paper. */
export const FALLBACK_PAGE_BACKGROUND = '#0f0908';

export type StudioPaintedColors = {
  pageBackground: string | null;
  role: string | null;
  button: { fill: string; ink: string } | null;
};

/** Read what the page paints for `role` (each value `null` when it cannot be resolved). */
export function readStudioPaintedColors(
  role: BrandRole,
  resolve: (cssColor: string) => string | null
): StudioPaintedColors {
  const fill = resolve('var(--theme-button-fill-color)');
  const ink = resolve('var(--theme-button-fg-color)');
  return {
    pageBackground: resolve('var(--theme-main-background-color)'),
    role: resolve(`var(--theme-${role}-color)`),
    button: fill && ink ? { fill, ink } : null,
  };
}

export type StudioReadout = {
  pageBackground: string;
  /** The raw pick as a mark on the page (3:1). */
  pick: RoleCheck;
  /** The colour the page shows for the role, and its check (≥ 3:1 by construction). */
  shownHex: string;
  shown: RoleCheck;
  /** Primary button text on the painted fill (4.5:1: it is read as text). */
  buttonColors: { fill: string; ink: string };
  button: RoleCheck;
};

export function studioReadout(pick: string, painted: StudioPaintedColors): StudioReadout {
  const pageBackground = painted.pageBackground ?? FALLBACK_PAGE_BACKGROUND;
  const shownHex = painted.role ?? pick;
  const buttonColors = painted.button ?? { fill: shownHex, ink: '#ffffff' };
  const ratio = Math.round(Color.contrastRatio(buttonColors.ink, buttonColors.fill) * 100) / 100;
  return {
    pageBackground,
    pick: evaluateRoleContrast(pick, pageBackground),
    shownHex,
    shown: evaluateRoleContrast(shownHex, pageBackground),
    buttonColors,
    button: { ratio, min: 4.5, pass: ratio >= 4.5 },
  };
}
