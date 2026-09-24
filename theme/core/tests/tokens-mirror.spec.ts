import { describe, expect, it } from 'vitest';

import { darkCssVariables, lightCssVariables, palettes, semanticColors, themeColors } from '../src/tokens.js';

const REQUIRED_CSS_KEYS = [
  '--primary-color',
  '--secondary-color',
  '--text-color',
  '--main-background',
  '--main-background-secondary',
  '--primary-hover',
  '--button-fg',
] as const;

describe('Sass-aligned token mirrors', () => {
  it('pins Midnight Magic palette hexes to Sass named tokens', () => {
    expect(palettes.midnightMagic).toEqual({
      darkAmethyst: '#3a015c',
      deepPurple: '#4f0147',
      midnightViolet: '#35012c',
      midnightVioletDk: '#11001c',
    });
  });

  it('mirrors brand and surface roles from tokens/_colors.scss', () => {
    expect(themeColors.light.primary).toBe('#d9531d');
    expect(themeColors.dark.primary).toBe('#ac1922');
    expect(themeColors.light.secondary).toBe('#6e1622');
    expect(themeColors.dark.secondary).toBe('#8a6a56');
    expect(themeColors.light.background).toBe('#faf6f3');
    expect(themeColors.dark.background).toBe('#0f0908');
    expect(semanticColors.success).toBe('#1b7a7a');
  });

  it('mirrors Sass primary-hover from parchment/ink adjust (not brand primary)', () => {
    expect(darkCssVariables['--primary-hover']).toBe('#f1efe9');
    expect(lightCssVariables['--primary-hover']).toBe('#020203');
  });

  it('includes required CSS keys on light and dark maps', () => {
    for (const key of REQUIRED_CSS_KEYS) {
      expect(lightCssVariables[key]).toBeTruthy();
      expect(darkCssVariables[key]).toBeTruthy();
    }
    expect(lightCssVariables['--primary-color']).toBe(themeColors.light.primary);
    expect(darkCssVariables['--primary-color']).toBe(themeColors.dark.primary);
  });

  it('omits layout ratio/breakpoint keys from mode maps (Sass media queries own those)', () => {
    expect(lightCssVariables).not.toHaveProperty('--surface-ratio');
    expect(darkCssVariables).not.toHaveProperty('--breakpoint');
  });
});
