/**
 * Perceptual quality scoring for single colors and harmony palettes.
 */

import { formatColor, hslToRgb, normalizeHue, parseColor, type ColorInput, type RgbTriple } from './color-palette.js';
import { contrastRatio, type ContrastRgb } from './contrast.js';

export type ColorTemperature = 'warm' | 'cool' | 'neutral';

export type ColorQualityMetrics = {
  perceivedBrightness: number;
  harmony: number;
  screenStability: number;
  isWebSafe: boolean;
  wcagCompliant: boolean;
  temperature: ColorTemperature;
  vividness: number;
};

export type ColorQuality = {
  original: string;
  score: number;
  passes: boolean;
  metrics: ColorQualityMetrics;
  recommendations: string[];
};

export type ColorPaletteQuality = {
  score: number;
  passes: boolean;
  colors: ColorQuality[];
  metrics: {
    contrastRatios: number[];
    hueDiversity: number;
    visualBalance: number;
  };
  recommendations: string[];
};

const PRIMARY_HUES = [0, 30, 60, 120, 180, 240, 300];
const WEB_SAFE_VALUES = [0, 51, 102, 153, 204, 255];

function requireParsed(color: ColorInput) {
  const parsed = parseColor(color);
  if (!parsed) {
    throw new Error(`Invalid color format: ${color}`);
  }
  return parsed;
}

export function analyzeColorQuality(color: ColorInput): ColorQuality {
  const parsed = requireParsed(color);
  const { h, s, l, original } = parsed;
  const rgb = hslToRgb(h, s, l);

  const perceivedBrightness = calculatePerceivedBrightness(rgb);
  const harmony = calculateColorHarmony(h, s, l);
  const screenStability = calculateScreenStability(rgb);
  const isWebSafe = checkWebSafe(rgb);
  const wcagCompliant = parsed.a < 1 ? false : checkWcagCompliance(rgb);
  const temperature = getColorTemperature(h, s);
  const vividness = calculateVividness(s, l);
  const score = calculateOverallScore({
    perceivedBrightness,
    harmony,
    screenStability,
    isWebSafe,
    wcagCompliant,
    vividness,
  });
  const metrics: ColorQualityMetrics = {
    perceivedBrightness,
    harmony,
    screenStability,
    isWebSafe,
    wcagCompliant,
    temperature,
    vividness,
  };

  return {
    original,
    score,
    passes: score >= 70,
    metrics,
    recommendations: generateRecommendations({ ...metrics }),
  };
}

export function analyzePaletteQuality(colors: ColorInput[]): ColorPaletteQuality {
  if (colors.length === 0) {
    return {
      score: 0,
      passes: false,
      colors: [],
      metrics: { contrastRatios: [], hueDiversity: 0, visualBalance: 0 },
      recommendations: ['Palette is empty. Add at least two colors.'],
    };
  }

  const analyzedColors = colors.map((c) => analyzeColorQuality(c));
  const averageScore = analyzedColors.reduce((sum, item) => sum + item.score, 0) / analyzedColors.length;

  const contrastRatios: number[] = [];
  let omittedTranslucentPairs = false;
  for (let i = 0; i < colors.length; i++) {
    for (let j = i + 1; j < colors.length; j++) {
      const left = colors[i];
      const right = colors[j];
      if (left == null || right == null) continue;
      const ratio = opaqueContrastRatioOrNull(left, right);
      if (ratio == null) {
        omittedTranslucentPairs = true;
        continue;
      }
      contrastRatios.push(ratio);
    }
  }

  const hues = analyzedColors.map((item) => parseColor(item.original)?.h ?? 0);
  const hueDiversity = calculateHueDiversity(hues);
  const visualBalance = calculateVisualBalance(analyzedColors);
  const recommendations = generatePaletteRecommendations({
    averageScore,
    contrastRatios,
    hueDiversity,
    visualBalance,
    analyzedColors,
    omittedTranslucentPairs,
  });

  return {
    score: averageScore,
    passes:
      averageScore >= 70 &&
      !omittedTranslucentPairs &&
      (contrastRatios.length === 0 || contrastRatios.every((ratio) => ratio >= 3)),
    colors: analyzedColors,
    metrics: {
      contrastRatios,
      hueDiversity,
      visualBalance,
    },
    recommendations,
  };
}

function calculatePerceivedBrightness(rgb: RgbTriple): number {
  const brightness = 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b;
  return Math.round((brightness / 255) * 100);
}

function circularHueDelta(a: number, b: number): number {
  const delta = Math.abs(normalizeHue(a) - normalizeHue(b));
  return Math.min(delta, 360 - delta);
}

function nearestPrimaryHue(h: number): number {
  return PRIMARY_HUES.reduce((prev, curr) => {
    return circularHueDelta(h, curr) < circularHueDelta(h, prev) ? curr : prev;
  });
}

function calculateColorHarmony(h: number, s: number, l: number): number {
  let score = 0;

  if (s >= 30 && s <= 80) score += 30;
  else if (s > 80) score += 15;
  else score += 10;

  if (l >= 30 && l <= 70) score += 30;
  else if (l > 70) score += 20;
  else score += 15;

  if (s > 10) score += 20;
  else score += 5;

  const distance = circularHueDelta(h, nearestPrimaryHue(h));
  if (distance < 15) score += 20;
  else if (distance < 30) score += 15;
  else score += 10;

  return Math.min(100, score);
}

function calculateScreenStability(rgb: RgbTriple): number {
  let score = 100;

  if (rgb.r === 0 && rgb.g === 0 && rgb.b === 0) score -= 20;
  if (rgb.r === 255 && rgb.g === 255 && rgb.b === 255) score -= 10;

  const maxVal = Math.max(rgb.r, rgb.g, rgb.b);
  const minVal = Math.min(rgb.r, rgb.g, rgb.b);
  const diff = maxVal - minVal;

  if (diff > 200) score -= 15;
  else if (diff > 150) score -= 10;
  else if (diff < 20) score -= 10;

  const avg = (rgb.r + rgb.g + rgb.b) / 3;
  const deviation = Math.abs(rgb.r - avg) + Math.abs(rgb.g - avg) + Math.abs(rgb.b - avg);
  if (deviation > 300) score -= 20;
  else if (deviation > 200) score -= 10;

  return Math.max(0, Math.min(100, score));
}

function checkWebSafe(rgb: RgbTriple): boolean {
  return WEB_SAFE_VALUES.includes(rgb.r) && WEB_SAFE_VALUES.includes(rgb.g) && WEB_SAFE_VALUES.includes(rgb.b);
}

function asContrastRgb(rgb: RgbTriple): ContrastRgb {
  return rgb;
}

/** Default canvas for single-color WCAG AA (4.5:1) checks. */
const WCAG_REFERENCE_BACKGROUND: ContrastRgb = { r: 255, g: 255, b: 255 };

function checkWcagCompliance(rgb: RgbTriple): boolean {
  // Against an explicit light canvas — black-or-white OR is tautological for opaque colors.
  return contrastRatio(asContrastRgb(rgb), WCAG_REFERENCE_BACKGROUND) >= 4.5;
}

export function calculateContrastRatio(color1: ColorInput, color2: ColorInput): number {
  const parsed1 = requireParsed(color1);
  const parsed2 = requireParsed(color2);
  if (parsed1.a < 1 || parsed2.a < 1) {
    throw new Error('Contrast requires opaque colors; alpha-bearing inputs are not composited');
  }
  const rgb1 = hslToRgb(parsed1.h, parsed1.s, parsed1.l);
  const rgb2 = hslToRgb(parsed2.h, parsed2.s, parsed2.l);
  return contrastRatio(asContrastRgb(rgb1), asContrastRgb(rgb2));
}

function opaqueContrastRatioOrNull(color1: ColorInput, color2: ColorInput): number | null {
  const parsed1 = parseColor(color1);
  const parsed2 = parseColor(color2);
  if (!parsed1 || !parsed2 || parsed1.a < 1 || parsed2.a < 1) {
    return null;
  }
  return calculateContrastRatio(color1, color2);
}

function getColorTemperature(h: number, s: number): ColorTemperature {
  if (s <= 0) return 'neutral';
  if ((h >= 0 && h < 60) || (h >= 300 && h <= 360)) return 'warm';
  if (h >= 180 && h < 300) return 'cool';
  return 'neutral';
}

function calculateVividness(s: number, l: number): number {
  const saturationScore = s;
  const lightnessScore = 100 - Math.abs(l - 50) * 2;
  return Math.min(100, saturationScore * 0.6 + lightnessScore * 0.4);
}

function calculateOverallScore(metrics: {
  perceivedBrightness: number;
  harmony: number;
  screenStability: number;
  isWebSafe: boolean;
  wcagCompliant: boolean;
  vividness: number;
}): number {
  let score = 0;
  score += metrics.perceivedBrightness * 0.1;
  score += metrics.harmony * 0.2;
  score += metrics.screenStability * 0.2;
  score += metrics.vividness * 0.15;
  score += metrics.isWebSafe ? 10 : 0;
  score += metrics.wcagCompliant ? 15 : 0;
  return Math.min(100, Math.round(score));
}

function calculateHueDiversity(hues: number[]): number {
  if (hues.length < 2) return 100;

  const sortedHues = [...hues].sort((a, b) => a - b);
  const first = sortedHues[0];
  const last = sortedHues[sortedHues.length - 1];
  if (first == null || last == null) return 100;

  let maxGap = 0;
  for (let i = 0; i < sortedHues.length - 1; i++) {
    const current = sortedHues[i];
    const next = sortedHues[i + 1];
    if (current == null || next == null) continue;
    maxGap = Math.max(maxGap, next - current);
  }
  maxGap = Math.max(maxGap, 360 - last + first);

  return Math.max(0, Math.min(100, 100 - maxGap / 3.6));
}

function calculateVisualBalance(colors: ColorQuality[]): number {
  if (colors.length < 2) return 100;

  const brightnesses = colors.map((c) => c.metrics.perceivedBrightness);
  const avgBrightness = brightnesses.reduce((sum, value) => sum + value, 0) / brightnesses.length;
  const brightnessVariance =
    brightnesses.reduce((sum, value) => sum + (value - avgBrightness) ** 2, 0) / brightnesses.length;

  let balanceScore = 0;
  if (brightnessVariance >= 100 && brightnessVariance <= 500) {
    balanceScore += 50;
  } else if (brightnessVariance >= 50 && brightnessVariance <= 700) {
    balanceScore += 30;
  } else {
    balanceScore += 10;
  }

  const avgScore = colors.reduce((sum, item) => sum + item.score, 0) / colors.length;
  balanceScore += avgScore / 2;
  return Math.min(100, Math.round(balanceScore));
}

function generateRecommendations(metrics: ColorQualityMetrics): string[] {
  const recommendations: string[] = [];

  if (metrics.perceivedBrightness < 30) {
    recommendations.push('Increase brightness for better visibility');
  } else if (metrics.perceivedBrightness > 80) {
    recommendations.push('Consider reducing brightness to reduce eye strain');
  }

  if (metrics.harmony < 50) {
    recommendations.push('Adjust hue toward a primary or secondary color for better harmony');
  }

  if (metrics.screenStability < 60) {
    recommendations.push('Avoid extreme RGB values for better screen stability');
  }

  if (!metrics.isWebSafe) {
    recommendations.push('Consider using web-safe color values for better cross-device consistency');
  }

  if (!metrics.wcagCompliant) {
    recommendations.push('Increase contrast against a light (#fff) background for WCAG AA text');
  }

  if (metrics.vividness < 40) {
    recommendations.push('Increase saturation for more visual impact');
  } else if (metrics.vividness > 80) {
    recommendations.push('Consider reducing saturation slightly for better eye comfort');
  }

  if (metrics.temperature === 'warm' && metrics.perceivedBrightness > 70) {
    recommendations.push('Warm colors may appear oversaturated on bright screens');
  }

  return recommendations;
}

function generatePaletteRecommendations(metrics: {
  averageScore: number;
  contrastRatios: number[];
  hueDiversity: number;
  visualBalance: number;
  analyzedColors: ColorQuality[];
  omittedTranslucentPairs: boolean;
}): string[] {
  const recommendations: string[] = [];

  if (metrics.omittedTranslucentPairs) {
    recommendations.push(
      'Translucent colors are omitted from pair contrast; use opaque colors for palette contrast scoring.'
    );
  }

  if (metrics.averageScore < 70) {
    recommendations.push('Overall palette quality is low. Consider replacing low-scoring colors');
  }

  if (metrics.contrastRatios.length > 0) {
    const avgContrast = metrics.contrastRatios.reduce((sum, ratio) => sum + ratio, 0) / metrics.contrastRatios.length;
    if (avgContrast < 3) {
      recommendations.push('Increase contrast between colors for better readability');
    }
    if (metrics.contrastRatios.some((ratio) => ratio < 2)) {
      recommendations.push('Some color pairs have very low contrast - ensure sufficient distinction');
    }
  }

  if (metrics.hueDiversity < 50) {
    recommendations.push('Colors are too similar. Spread hues more across the color wheel');
  }

  if (metrics.visualBalance < 60) {
    recommendations.push('Palette lacks visual balance. Mix light and dark colors');
  }

  const warmCount = metrics.analyzedColors.filter((item) => item.metrics.temperature === 'warm').length;
  const coolCount = metrics.analyzedColors.filter((item) => item.metrics.temperature === 'cool').length;
  if (warmCount > metrics.analyzedColors.length * 0.7) {
    recommendations.push('Too many warm colors - add some cool colors for balance');
  }
  if (coolCount > metrics.analyzedColors.length * 0.7) {
    recommendations.push('Too many cool colors - add some warm colors for balance');
  }

  return recommendations;
}

export function enhanceColor(color: ColorInput, targetQuality = 80): string {
  const parsed = requireParsed(color);
  let { h, s, l } = parsed;
  const { a, format } = parsed;
  let attempts = 0;
  let quality = analyzeColorQuality(formatColor(h, s, l, a, format));

  while (quality.score < targetQuality && attempts < 50) {
    const recs = quality.recommendations;

    if (recs.some((r) => r.includes('Increase brightness'))) {
      l = Math.min(100, l + 2);
    }
    if (recs.some((r) => r.includes('reducing brightness'))) {
      l = Math.max(0, l - 2);
    }
    if (recs.some((r) => r.includes('Increase saturation'))) {
      s = Math.min(100, s + 2);
    }
    if (recs.some((r) => r.includes('reducing saturation'))) {
      s = Math.max(0, s - 2);
    }
    if (recs.some((r) => r.includes('Adjust hue'))) {
      h = h + (nearestPrimaryHue(h) - h) * 0.1;
    }

    quality = analyzeColorQuality(formatColor(h, s, l, a, format));
    attempts += 1;
  }

  return formatColor(h, s, l, a, format);
}
