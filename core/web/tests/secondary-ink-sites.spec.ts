import {
  buildColorVariations,
  buildSecondaryInkTokens,
  Color,
  DEFAULT_COLOR_SOURCES,
  DEFAULT_PAPER_INK,
  NEUTRAL_ROLE_STEPS,
  neutralStep,
  textGroundsFor,
  Theme,
} from '@tgmc/theme';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Secondary-coloured text on the tints `textGroundsFor` does not model (web sites of
 * `--theme-secondary-ink-color`): the architecture diagram's SVG group labels sit on the group fill
 * (`color-mix(primary 8%, transparent)` over the figure's surface wash), and the `/styles/parity`
 * column labels sit on the column wash and the surface-demo panels (one is a 16% accent wash). Both
 * mix the ink toward `--theme-text-color`; the share is read from the component, so the test follows
 * the code. Checked for the defaults and every theme preset, both modes (WCAG 1.4.3, ≥ 4.5:1).
 */

type Mode = 'light' | 'dark';
const MODES: readonly Mode[] = ['light', 'dark'];
const appDir = join(import.meta.dirname, '..', 'app');

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(Color.toHex(hex).slice(i, i + 2), 16));
/** `color-mix(in srgb, a p, b)` for opaque colours (also `a p%` over `transparent`, composited on `b`). */
function mixSrgb(a: string, p: number, b: string): string {
  const [x, y] = [rgb(a), rgb(b)];
  return (
    '#' +
    x
      .map((v, i) =>
        Math.round(v * p + y[i]! * (1 - p))
          .toString(16)
          .padStart(2, '0')
      )
      .join('')
  );
}

/** The ink share in `color-mix(in srgb, var(--theme-secondary-ink-color) N%, var(--theme-text-color))`. */
function inkShare(source: string, property: 'fill' | 'color', selector: RegExp): number {
  const block = selector.exec(source)?.[0] ?? '';
  const m = new RegExp(
    `${property}:\\s*color-mix\\(in srgb, var\\(--theme-secondary-ink-color\\) (\\d+)%, var\\(--theme-text-color\\)\\)`
  ).exec(block);
  expect(m, `${property} mixes the secondary ink into the text colour`).not.toBeNull();
  return Number(m![1]) / 100;
}

type Palette = {
  id: string;
  primary: Record<Mode, string>;
  secondary: Record<Mode, string>;
  accent: Record<Mode, string>;
};
const palettes: Palette[] = [
  { id: 'defaults', ...DEFAULT_COLOR_SOURCES },
  ...Theme.presets().map((p) => ({ id: p.id, primary: p.primary, secondary: p.secondary, accent: p.accent })),
];

function colours(palette: Palette, mode: Mode) {
  const pair = DEFAULT_PAPER_INK[mode];
  const sources = {
    ...DEFAULT_COLOR_SOURCES,
    primary: palette.primary,
    secondary: palette.secondary,
    accent: palette.accent,
  };
  const variations = buildColorVariations(sources, DEFAULT_PAPER_INK);
  const steps = NEUTRAL_ROLE_STEPS[mode];
  const page = neutralStep(pair, steps['--theme-main-background-color']);
  const surface = neutralStep(pair, steps['--theme-surface-color']);
  return {
    ink: buildSecondaryInkTokens(sources, DEFAULT_PAPER_INK)[`--theme-secondary-ink-${mode}-color`]!,
    text: neutralStep(pair, steps['--theme-text-color']),
    primary: variations[`--theme-primary-${mode}-color`]!,
    accent: variations[`--theme-accent-${mode}-color`]!,
    page,
    surface,
    grounds: textGroundsFor(pair, mode),
  };
}

const worst = (fg: string, grounds: string[]) => Math.min(...grounds.map((g) => Color.contrastRatio(fg, g)));

describe('secondary ink on tints (web sites)', () => {
  it('has the defaults plus every preset', () => {
    expect(palettes).toHaveLength(22);
  });

  it('architecture diagram group labels read ≥ 4.5:1 on the group fill, every palette, both modes', () => {
    const source = readFileSync(join(appDir, 'components', 'AppArchitectureDiagram.vue'), 'utf8');
    const share = inkShare(source, 'fill', /&__group-label\s*\{[^}]*\}/);
    const misses: string[] = [];
    for (const palette of palettes)
      for (const mode of MODES) {
        const c = colours(palette, mode);
        // Figure wash (surface 72% over the page) plus every text ground, each under the 8% primary group fill.
        const under = [...c.grounds, mixSrgb(c.surface, 0.72, c.page)];
        const label = mixSrgb(c.ink, share, c.text);
        const ratio = worst(
          label,
          under.map((g) => mixSrgb(c.primary, 0.08, g))
        );
        if (ratio < 4.5) misses.push(`${palette.id} ${mode} ${ratio.toFixed(2)}`);
      }
    expect(misses).toEqual([]);
  });

  it('/styles/parity column labels read ≥ 4.5:1 on the column washes and panels, every palette, both modes', () => {
    const source = readFileSync(join(appDir, 'components', 'AppStylesParity', 'index.vue'), 'utf8');
    const share = inkShare(source, 'color', /^\.styles-col__label\s*\{[^}]*\}/m);
    const misses: string[] = [];
    for (const palette of palettes)
      for (const mode of MODES) {
        const c = colours(palette, mode);
        // Column wash (surface 45% over the page), the main / surface panels, the 16% accent wash panel.
        const under = [...c.grounds, mixSrgb(c.surface, 0.45, c.page), mixSrgb(c.accent, 0.16, c.page)];
        const ratio = worst(mixSrgb(c.ink, share, c.text), under);
        if (ratio < 4.5) misses.push(`${palette.id} ${mode} ${ratio.toFixed(2)}`);
      }
    expect(misses).toEqual([]);
  });
});
