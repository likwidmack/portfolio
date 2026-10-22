import {
  Color,
  compositeOver,
  CONTRAST_TARGET,
  DEFAULT_PAPER_INK,
  SOLID_COLORS,
  STATUS_COLORS,
  textGroundsFor,
  WASH_ALPHA,
} from '@tgmc/theme';
import { describe, expect, it } from 'vitest';

import { BRAND_PACKS, brandRolesFromPack, defaultPaperInk } from '../shared/preferences';
import { buildRuntimeColorTokens } from '../shared/preferences/paint';

/**
 * Every Style Studio preset, as the runtime paints it (`buildRuntimeColorTokens` for the pack), meets
 * its contrast targets in both modes on the default paper / ink: main colours 3:1, status 4.5:1 and
 * focus 3:1 on paper; every `-background` variation carries the ink at 4.5:1; the text roles
 * (primary / secondary / status inks) reach 4.5:1 on page, secondary page, surface and variant; and
 * primary-ink stays 4.5:1 on the hover / active washes. (Before: only `colorRed` was tested.)
 */
const ratio = (a: string, b: string) => Color.contrastRatio(a, b);
const MODES = ['light', 'dark'] as const;

describe('every Studio preset meets its contrast targets (runtime map, both modes)', () => {
  it('there are 21 presets', () => {
    expect(BRAND_PACKS).toHaveLength(21);
  });

  for (const pack of BRAND_PACKS)
    it(pack.id, () => {
      const map = buildRuntimeColorTokens(brandRolesFromPack(pack.id, 'light'), defaultPaperInk(), pack.id)!;
      expect(map, 'a preset writes a runtime map').not.toBeNull();
      const failures: string[] = [];
      const need = (label: string, r: number, min: number) => {
        if (r < min) failures.push(`${label}: ${r.toFixed(2)} < ${min}`);
      };
      for (const mode of MODES) {
        const { paper, ink } = DEFAULT_PAPER_INK[mode];
        const grounds = textGroundsFor(DEFAULT_PAPER_INK[mode], mode);
        const worst = (fg: string) => Math.min(...grounds.map((g) => ratio(fg, g)));
        for (const c of SOLID_COLORS) {
          need(`${mode} ${c} on paper`, ratio(map[`--theme-${c}-${mode}-color`]!, paper), CONTRAST_TARGET[c]);
          need(`${mode} ink on ${c}-background`, ratio(ink, map[`--theme-${c}-${mode}-background-color`]!), 4.5);
        }
        for (const role of ['primary', 'secondary', ...STATUS_COLORS])
          need(`${mode} ${role}-ink on text grounds`, worst(map[`--theme-${role}-ink-${mode}-color`]!), 4.5);
        const primaryInk = map[`--theme-primary-ink-${mode}-color`]!;
        for (const c of ['primary', 'secondary'])
          for (const g of grounds)
            need(
              `${mode} primary-ink on ${c} wash over ${g}`,
              ratio(primaryInk, compositeOver(g, map[`--theme-${c}-wash-${mode}-color`]!, WASH_ALPHA)),
              4.5
            );
      }
      expect(failures).toEqual([]);
    });
});
