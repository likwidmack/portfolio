import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { Color } from '../src/color';
import {
  buildColorVariations,
  buildSecondaryInkTokens,
  DEFAULT_COLOR_SOURCES,
  textGroundsFor,
} from '../src/color-variations';
import { DEFAULT_PAPER_INK, NEUTRAL_ROLE_STEPS, neutralStep } from '../src/paper-ink';
import presetsJson from '../src/theme-presets.json' with { type: 'json' };

/**
 * Table headers (`globals/_container.scss` `thead th`) sit on the secondary head tint
 * (`--theme-secondary-a<n>-color`: the mode's secondary variation over the ground), a ground
 * `textGroundsFor` does not model, so they mix the secondary ink toward `--theme-text-color`. The
 * share and the tint are read from the Sass sources; checked on every text ground under the tint,
 * for the defaults and every theme preset (its own secondary), both modes (WCAG 1.4.3).
 */

type Mode = 'light' | 'dark';
const scss = (path: string) => readFileSync(join(import.meta.dirname, '..', 'scss', path), 'utf8');

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(Color.toHex(hex).slice(i, i + 2), 16));
/** `color-mix(in srgb, a p, b)` for opaque colours (also `rgba(a, p)` composited on `b`). */
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

const container = scss('globals/_container.scss');
const thead =
  /thead\s*\{[\s\S]*?background-color:\s*var\(--theme-secondary-a(\d+)-color\)[\s\S]*?th\s*\{([^}]*)\}/.exec(container);
const share =
  /color:\s*color-mix\(in srgb, var\(--theme-secondary-ink-color\) (\d+)%, var\(--theme-text-color\)\)/.exec(
    thead?.[2] ?? ''
  );

const palettes = [
  { id: 'defaults', ...DEFAULT_COLOR_SOURCES },
  ...(presetsJson as { presets: Array<{ id: string; secondary: Record<Mode, string> }> }).presets.map((p) => ({
    ...DEFAULT_COLOR_SOURCES,
    id: p.id,
    secondary: p.secondary,
  })),
];

describe('table headers: secondary ink on the thead tint', () => {
  it('reads the tint and the ink share from the Sass', () => {
    expect(thead, 'thead secondary tint + th rule').not.toBeNull();
    expect(share, 'th mixes the secondary ink into the text colour').not.toBeNull();
    expect(palettes).toHaveLength(22);
  });

  it('th reads ≥ 4.5:1 on the tint over every text ground, every palette, both modes', () => {
    const tint = Number(thead![1]) / 100;
    const inkShare = Number(share![1]) / 100;
    const misses: string[] = [];
    for (const palette of palettes)
      for (const mode of ['light', 'dark'] as const) {
        const pair = DEFAULT_PAPER_INK[mode];
        const ink = buildSecondaryInkTokens(palette, DEFAULT_PAPER_INK)[`--theme-secondary-ink-${mode}-color`]!;
        const head = buildColorVariations(palette, DEFAULT_PAPER_INK)[`--theme-secondary-${mode}-color`]!;
        const text = neutralStep(pair, NEUTRAL_ROLE_STEPS[mode]['--theme-text-color']);
        const th = mixSrgb(ink, inkShare, text);
        const ratio = Math.min(
          ...textGroundsFor(pair, mode).map((g) => Color.contrastRatio(th, mixSrgb(head, tint, g)))
        );
        if (ratio < 4.5) misses.push(`${palette.id} ${mode} ${ratio.toFixed(2)}`);
      }
    expect(misses).toEqual([]);
  });
});
