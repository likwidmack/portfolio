import { describe, expect, it } from 'vitest';

import {
  analyzeColorQuality,
  analyzePaletteQuality,
  calculateContrastRatio,
  enhanceColor,
} from '../src/color-quality.js';

describe('color quality', () => {
  it('scores a vivid hex color with metrics and the original input', () => {
    const quality = analyzeColorQuality('#FF5733');
    expect(quality.original).toBe('#FF5733');
    expect(quality.score).toBeGreaterThanOrEqual(0);
    expect(quality.score).toBeLessThanOrEqual(100);
    expect(quality.metrics.temperature).toBe('warm');
    expect(quality.metrics.vividness).toBeGreaterThan(40);
    expect(Array.isArray(quality.recommendations)).toBe(true);
  });

  it('classifies achromatic colors as neutral regardless of parsed hue', () => {
    expect(analyzeColorQuality('#808080').metrics.temperature).toBe('neutral');
    expect(analyzeColorQuality('#ffffff').metrics.temperature).toBe('neutral');
    expect(analyzeColorQuality('hsl(0, 0%, 20%)').metrics.temperature).toBe('neutral');
  });

  it('rejects invalid colors', () => {
    expect(() => analyzeColorQuality('chartreuse')).toThrow(/Invalid color format/);
    expect(() => calculateContrastRatio('#000', 'nope')).toThrow(/Invalid color format/);
  });

  it('reports WCAG contrast of black against white as 21:1', () => {
    expect(calculateContrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 0);
    expect(calculateContrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 0);
  });

  it('does not treat translucent inputs as opaque for contrast or WCAG', () => {
    expect(() => calculateContrastRatio('rgba(255, 255, 255, 0)', '#000000')).toThrow(/opaque/);
    expect(analyzeColorQuality('rgba(255, 255, 255, 0)').metrics.wcagCompliant).toBe(false);
  });

  it('scores WCAG AA against an explicit light canvas, not black-or-white', () => {
    expect(analyzeColorQuality('#000000').metrics.wcagCompliant).toBe(true);
    expect(analyzeColorQuality('#FFFFFF').metrics.wcagCompliant).toBe(false);
    expect(analyzeColorQuality('#CCCCCC').metrics.wcagCompliant).toBe(false);
  });

  it('omits translucent pairs from palette contrast instead of throwing', () => {
    const palette = analyzePaletteQuality(['rgba(255, 87, 51, 0.5)', '#fff']);
    expect(palette.metrics.contrastRatios).toEqual([]);
    expect(palette.passes).toBe(false);
    expect(palette.recommendations.some((item) => /translucent/i.test(item))).toBe(true);
  });

  it('scores hues near 0° as adjacent to red on the wheel', () => {
    const nearRed = analyzeColorQuality('hsl(359, 50%, 50%)');
    const midGap = analyzeColorQuality('hsl(90, 50%, 50%)');
    expect(nearRed.metrics.harmony).toBeGreaterThan(midGap.metrics.harmony);
  });

  it('analyzes a multi-hue palette without using an undefined original', () => {
    const palette = analyzePaletteQuality(['#FF5733', '#33FF57', '#3357FF']);
    expect(palette.colors).toHaveLength(3);
    expect(palette.colors.every((item) => item.original.startsWith('#'))).toBe(true);
    expect(palette.metrics.contrastRatios.length).toBe(3);
    expect(palette.metrics.hueDiversity).toBeGreaterThan(0);
  });

  it('treats an empty palette as a failing quality result', () => {
    const empty = analyzePaletteQuality([]);
    expect(empty.score).toBe(0);
    expect(empty.passes).toBe(false);
    expect(empty.recommendations[0]).toMatch(/empty/i);
  });

  it('returns a parseable enhanced color', () => {
    const enhanced = enhanceColor('#FF5733', 70);
    expect(enhanced).toMatch(/^#|rgb|hsl/);
    expect(analyzeColorQuality(enhanced).score).toBeGreaterThanOrEqual(analyzeColorQuality('#808080').score);
  });
});
