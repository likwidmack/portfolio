import { describe, expect, it } from 'vitest';

import { evaluateRoleContrast } from '../shared/contrast-guard';

const DARK_BG = '#0f0908';
const LIGHT_BG = '#faf6f3';

describe('evaluateRoleContrast', () => {
  it('passes ember as a mark on the dark page (3:1)', () => {
    const result = evaluateRoleContrast('#d9531d', DARK_BG);
    expect(result.min).toBe(3);
    expect(result.pass).toBe(true);
  });

  it('uses the 3:1 mark threshold (links use --theme-link-color)', () => {
    expect(evaluateRoleContrast('#19aca3', DARK_BG).min).toBe(3);
  });

  it('flags brand red as too dark to read as a mark on the dark page', () => {
    expect(evaluateRoleContrast('#ac1922', DARK_BG).pass).toBe(false);
  });

  it('rounds the ratio to two decimals and passes a mark on the light page', () => {
    const result = evaluateRoleContrast('#a8360e', LIGHT_BG);
    expect(result.ratio).toBe(Math.round(result.ratio * 100) / 100);
    expect(result.pass).toBe(true);
  });
});
