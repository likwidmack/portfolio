import { describe, expect, it } from 'vitest';

import {
  createAnalogousColors,
  createColorPalette,
  formatColor,
  getComplementaryColor,
  getSplitComplementaryColors,
  getTetradicColors,
  getTriadicColors,
  hslToRgb,
  isValidColorFormat,
  normalizeHue,
  parseColor,
} from '../src/color-palette.js';

describe('color palette', () => {
  it('parses hex, rgb, and hsl notations', () => {
    expect(parseColor('#f00')?.h).toBeCloseTo(0, 0);
    expect(parseColor('#FF0000')).toMatchObject({ format: 'hex', a: 1 });
    expect(parseColor('#FF000080')).toMatchObject({ format: 'rgba' });
    expect(parseColor('rgb(255, 0, 0)')).toMatchObject({ format: 'rgb' });
    expect(parseColor('hsl(180, 50%, 40%)')).toMatchObject({ h: 180, s: 50, l: 40, format: 'hsl' });
    expect(parseColor('not-a-color')).toBeNull();
    expect(parseColor('#1z3456')).toBeNull();
    expect(parseColor('rgb(300, 0, 0)')).toBeNull();
    expect(parseColor('hsl(180, 150%, 50%)')).toBeNull();
    expect(parseColor('hsl(720, 100%, 50%)')?.h).toBe(0);
    expect(parseColor('hsl(-30, 50%, 50%)')?.h).toBe(330);
    expect(parseColor('hsl(12.5, 50%, 50%)')?.h).toBeCloseTo(12.5, 1);
    expect(parseColor('hsl(12.3.4, 50%, 50%)')).toBeNull();
    expect(parseColor('rgba(255, 0, 0, 0.5.1)')).toBeNull();
    expect(parseColor('rgba(255, 0, 0, .5)')).toMatchObject({ format: 'rgba', a: 0.5 });
    expect(parseColor('hsla(1e308, 50%, 50%)')).toBeNull();
    expect(parseColor('hsl(Infinity, 50%, 50%)')).toBeNull();
  });

  it('rejects invalid strings via the type guard', () => {
    expect(isValidColorFormat('#FF5733')).toBe(true);
    expect(isValidColorFormat('rgba(255, 87, 51, 0.8)')).toBe(true);
    expect(isValidColorFormat('blue')).toBe(false);
    expect(isValidColorFormat('#gg0000')).toBe(false);
    expect(isValidColorFormat('rgb(300, 0, 0)')).toBe(false);
    expect(isValidColorFormat('hsl(180, 150%, 50%)')).toBe(false);
    expect(isValidColorFormat('hsl(12.3.4, 50%, 50%)')).toBe(false);
    expect(isValidColorFormat('rgba(255, 0, 0, 0.5.1)')).toBe(false);
  });

  it('places complementary color 180° away', () => {
    const parsed = parseColor('#FF0000');
    const complement = parseColor(getComplementaryColor('#FF0000'));
    expect(parsed).not.toBeNull();
    expect(complement).not.toBeNull();
    expect(normalizeHue((complement?.h ?? 0) - (parsed?.h ?? 0))).toBeCloseTo(180, 0);
  });

  it('returns the requested count of analogous and harmony relatives', () => {
    expect(createAnalogousColors('#2ECC71', 45, 3)).toHaveLength(3);
    expect(getSplitComplementaryColors('#3498DB')).toHaveLength(2);
    expect(getTriadicColors('#3498DB')).toHaveLength(2);
    expect(getTetradicColors('#3498DB')).toHaveLength(3);

    const palette = createColorPalette('#FF5733', { angle: 30, count: 2 });
    expect(palette.original).toBe('#FF5733');
    expect(palette.analogous).toHaveLength(2);
    expect(palette.complementary).toMatch(/^#/);
  });

  it('keeps hsl output in the source format', () => {
    expect(getComplementaryColor('hsl(12, 100%, 60%)')).toMatch(/^hsl\(/);
    expect(createColorPalette('rgba(255, 87, 51, 0.8)').complementary).toMatch(/^rgba\(/);
  });

  it('throws on unparseable input', () => {
    expect(() => createColorPalette('nope')).toThrow(/Invalid color format/);
    expect(() => getTriadicColors('')).toThrow(/Invalid color format/);
    expect(() => createAnalogousColors('#2ECC71', 30, Number.POSITIVE_INFINITY)).toThrow(/0 to 64/);
    expect(() => createAnalogousColors('#2ECC71', 30, -1)).toThrow(/0 to 64/);
    expect(() => createAnalogousColors('#2ECC71', 30, 1.5)).toThrow(/0 to 64/);
    expect(() => createAnalogousColors('#2ECC71', 30, Number.MAX_SAFE_INTEGER)).toThrow(/0 to 64/);
    expect(() => createAnalogousColors('#2ECC71', 30, 65)).toThrow(/0 to 64/);
    expect(() => createAnalogousColors('#2ECC71', Number.NaN, 2)).toThrow(/finite number/);
    expect(() => createAnalogousColors('#2ECC71', Number.POSITIVE_INFINITY, 2)).toThrow(/finite number/);
    expect(() => createColorPalette('#2ECC71', { angle: Number.NaN })).toThrow(/finite number/);
  });

  it('bounds a huge finite analogous angle before multiplying by count', () => {
    const colors = createAnalogousColors('#2ECC71', Number.MAX_VALUE, 2);
    expect(colors).toHaveLength(2);
    for (const color of colors) {
      expect(color).toMatch(/^#/);
      expect(isValidColorFormat(color)).toBe(true);
    }
  });

  it('round-trips HSL through RGB for a mid gray', () => {
    expect(hslToRgb(0, 0, 50)).toEqual({ r: 128, g: 128, b: 128 });
    expect(formatColor(0, 0, 50, 1, 'hex')).toBe('#808080');
  });

  it('rejects out-of-range or non-finite HSL channels at the public hslToRgb boundary', () => {
    expect(() => hslToRgb(0, 200, 50)).toThrow(/0–100/);
    expect(() => hslToRgb(0, 50, -1)).toThrow(/0–100/);
    expect(() => hslToRgb(Number.NaN, 50, 50)).toThrow(/finite/);
    expect(() => hslToRgb(0, Number.POSITIVE_INFINITY, 50)).toThrow(/finite/);
  });

  it('rejects non-finite components in public formatColor', () => {
    expect(() => formatColor(0, Number.NaN, 50, 1, 'rgba')).toThrow(/finite/);
    expect(() => formatColor(0, 50, 50, Number.POSITIVE_INFINITY, 'hex')).toThrow(/finite/);
  });
});
