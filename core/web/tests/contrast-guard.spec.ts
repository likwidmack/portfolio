import { describe, expect, it } from 'vitest';

import { evaluateRoleContrast, nearestPassingShade, type BrandRole } from '../shared/contrast-guard';

const DARK_BG = '#0f0908';
const LIGHT_BG = '#faf6f3';

describe('evaluateRoleContrast', () => {
  it('flags ember as failing white text (~4.0:1) but passing as a mark on the dark page', () => {
    const result = evaluateRoleContrast('primary', '#d9531d', DARK_BG);
    expect(result.onFill.pass).toBe(false);
    expect(result.onFill.ratio).toBeCloseTo(4.03, 1);
    expect(result.onPage.min).toBe(3);
    expect(result.onPage.pass).toBe(true);
  });

  it('uses the 3:1 mark threshold for every role (links use --link-color)', () => {
    for (const role of ['primary', 'secondary', 'accent'] as BrandRole[]) {
      expect(evaluateRoleContrast(role, '#19aca3', DARK_BG).onPage.min).toBe(3);
    }
  });

  it('flags brand red as too dark to read as a mark on the dark page', () => {
    expect(evaluateRoleContrast('primary', '#ac1922', DARK_BG).onPage.pass).toBe(false);
  });

  it('has at least one colour that passes both checks on each ground (no fix ping-pong)', () => {
    for (const bg of [DARK_BG, LIGHT_BG]) {
      for (const role of ['primary', 'secondary', 'accent'] as BrandRole[]) {
        const both = ['#d13f52', '#b83f16', '#a8360e', '#c42029'].some((hex) => {
          const r = evaluateRoleContrast(role, hex, bg);
          return r.onFill.pass && r.onPage.pass;
        });
        expect(both, `${role} on ${bg}`).toBe(true);
      }
    }
  });
});

describe('nearestPassingShade', () => {
  it('darkens ember until white text passes 4.5:1', () => {
    const fixed = nearestPassingShade('#d9531d', '#ffffff', 4.5, '#000000');
    expect(fixed).not.toBe('#d9531d');
    expect(evaluateRoleContrast('primary', fixed, DARK_BG).onFill.pass).toBe(true);
  });

  it('lightens brand red until it reads as a mark, and the result still carries white text', () => {
    const fixed = nearestPassingShade('#ac1922', DARK_BG, 3, '#ffffff');
    const result = evaluateRoleContrast('primary', fixed, DARK_BG);
    expect(result.onPage.pass).toBe(true);
    expect(result.onFill.pass).toBe(true);
  });

  it('returns the input unchanged when it already passes', () => {
    expect(nearestPassingShade('#ac1922', '#ffffff', 4.5, '#000000')).toBe('#ac1922');
  });
});
