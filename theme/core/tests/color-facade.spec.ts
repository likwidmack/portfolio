import { describe, expect, it } from 'vitest';

import { Color } from '../src/color.js';

describe('Color facade', () => {
  it('parses and round-trips hex through rgb/hsl helpers', () => {
    const parsed = Color.parse('#ac1922');
    expect(parsed).not.toBeNull();
    expect(parsed?.format).toBe('hex');
    const rgb = Color.hexToRgb('#ac1922');
    expect(rgb).toEqual({ r: 172, g: 25, b: 34 });
    expect(rgb).not.toBeNull();
    if (!rgb) return;
    const hsl = Color.rgbToHsl(rgb.r, rgb.g, rgb.b);
    const back = Color.hexToRgb(Color.hslToHex(hsl.h, hsl.s, hsl.l));
    expect(back).not.toBeNull();
    if (!back) return;
    // Integer HSL round-trip may drift by 1–2 channels.
    expect(Math.abs(back.r - rgb.r)).toBeLessThanOrEqual(2);
    expect(Math.abs(back.g - rgb.g)).toBeLessThanOrEqual(2);
    expect(Math.abs(back.b - rgb.b)).toBeLessThanOrEqual(2);
  });

  it('create throws on invalid input; parse returns null', () => {
    expect(Color.parse('not-a-color')).toBeNull();
    expect(() => Color.create('not-a-color')).toThrow(/Invalid color format/);
  });

  it('lightens, darkens, and adds alpha for a fixture', () => {
    const base = '#808080';
    const lighter = Color.lighten(base, 10);
    const darker = Color.darken(base, 10);
    expect(Color.hexToRgb(lighter)?.r).toBeGreaterThan(Color.hexToRgb(base)?.r ?? 0);
    expect(Color.hexToRgb(darker)?.r).toBeLessThan(Color.hexToRgb(base)?.r ?? 255);
    expect(Color.addAlpha('#ff0000', 0.5).toLowerCase()).toBe('#ff000080');
  });

  it('looks up theme role colors for dark mode', () => {
    expect(Color.get('primary', 'dark')).toBe('#ac1922');
    expect(Color.get('secondary', 'light')).toBe('#6e1622');
    expect(Color.lookup({ kind: 'palette', palette: 'midnightMagic', swatch: 'darkAmethyst' })).toBe('#3a015c');
  });
});
