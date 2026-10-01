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
 * Style Studio contrast guard for a brand role colour.
 * - `onFill`: white text on the role fill (buttons, chips) — 4.5:1.
 * - `onPage`: the role as a mark on the page background (active underline, borders, chips) — 3:1.
 *   Text links use the theme's `--link-color`, never the brand primary, so no role needs 4.5:1
 *   on the page. (Both 4.5:1 checks are unsatisfiable together on a near-black ground.)
 */
export function evaluateRoleContrast(
  _role: BrandRole,
  hex: string,
  pageBackground: string
): { onFill: RoleCheck; onPage: RoleCheck } {
  return {
    onFill: check(ratioOf('#ffffff', hex), 4.5),
    onPage: check(ratioOf(hex, pageBackground), 3),
  };
}

function mix(hex: string, toward: string, t: number): string {
  const a = parseCssColor(hex);
  const b = parseCssColor(toward);
  if (!a || !b) return hex;
  const channel = (x: number, y: number) =>
    Math.round(x * (1 - t) + y * t)
      .toString(16)
      .padStart(2, '0');
  return `#${channel(a.r, b.r)}${channel(a.g, b.g)}${channel(a.b, b.b)}`;
}

/**
 * Smallest 5 % step toward black or white that reaches `min` against `against`.
 * Returns the input unchanged when it already passes, and `toward` as a last resort.
 */
export function nearestPassingShade(hex: string, against: string, min: number, toward: '#000000' | '#ffffff'): string {
  if (ratioOf(hex, against) >= min) return hex;
  for (let step = 1; step <= 20; step += 1) {
    const next = mix(hex, toward, step * 0.05);
    if (ratioOf(next, against) >= min) return next;
  }
  return toward;
}
