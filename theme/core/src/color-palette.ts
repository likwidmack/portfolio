/**
 * Color-wheel palettes and CSS color parse/format helpers for `@tgmc/theme`.
 * Accepts hex (#RGB, #RRGGBB, #RGBA, #RRGGBBAA), rgb/rgba, and hsl/hsla.
 */

export type ColorFormat = 'hex' | 'rgb' | 'rgba' | 'hsl' | 'hsla';

/** Runtime color string in a supported CSS notation. */
export type ColorInput = string;

export type ParsedColor = {
  format: ColorFormat;
  h: number;
  s: number;
  l: number;
  a: number;
  original: string;
};

export type RgbTriple = {
  r: number;
  g: number;
  b: number;
};

export type HslTriple = {
  h: number;
  s: number;
  l: number;
};

/** Practical upper bound for analogous generation (rejects huge caller-controlled counts). */
export const MAX_ANALOGOUS_COUNT = 64;

export type AnalogousOptions = {
  /** Angle offset in degrees (default: 30). */
  angle?: number;
  /** Number of analogous colors to generate (default: 2, max: {@link MAX_ANALOGOUS_COUNT}). */
  count?: number;
};

export type HarmonyPalette = {
  original: string;
  analogous: string[];
  complementary: string;
  splitComplementary: string[];
  triadic: string[];
  tetradic: string[];
};

const HEX_PATTERN = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
/** CSS number: digits with at most one decimal; allows leading-dot alphas (`.5`). */
const CSS_NUMBER = String.raw`(?:\d+(?:\.\d+)?|\.\d+)`;
const CSS_SIGNED_NUMBER = String.raw`-?${CSS_NUMBER}`;
const RGB_PATTERN = new RegExp(
  String.raw`^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*(${CSS_NUMBER}))?\s*\)$`,
  'i'
);
const HSL_PATTERN = new RegExp(
  String.raw`^hsla?\(\s*(${CSS_SIGNED_NUMBER})\s*,\s*(${CSS_NUMBER})%\s*,\s*(${CSS_NUMBER})%(?:\s*,\s*(${CSS_NUMBER}))?\s*\)$`,
  'i'
);

export function isValidColorFormat(color: string): boolean {
  return parseColor(color) != null;
}

function requireParsed(color: ColorInput): ParsedColor {
  const parsed = parseColor(color);
  if (!parsed) {
    throw new Error(`Invalid color format: ${color}`);
  }
  return parsed;
}

function requireAnalogousCount(count: number): number {
  if (!Number.isSafeInteger(count) || count < 0 || count > MAX_ANALOGOUS_COUNT) {
    throw new Error(`Analogous count must be an integer from 0 to ${MAX_ANALOGOUS_COUNT}`);
  }
  return count;
}

function requireAnalogousAngle(angle: number): number {
  if (!Number.isFinite(angle)) {
    throw new Error('Analogous angle must be a finite number');
  }
  // One turn so `angle * count` cannot overflow for count <= MAX_ANALOGOUS_COUNT.
  return angle % 360;
}

/**
 * Creates analogous, complementary, split-complementary, triadic, and tetradic relatives.
 */
export function createColorPalette(color: ColorInput, options: AnalogousOptions = {}): HarmonyPalette {
  const { angle = 30, count = 2 } = options;
  const { format, h, s, l, a, original } = requireParsed(color);

  return {
    original,
    analogous: generateAnalogousColors(
      h,
      s,
      l,
      a,
      format,
      requireAnalogousAngle(angle),
      requireAnalogousCount(count)
    ),
    complementary: generateComplementaryColor(h, s, l, a, format),
    splitComplementary: generateSplitComplementaryColors(h, s, l, a, format),
    triadic: generateTriadicColors(h, s, l, a, format),
    tetradic: generateTetradicColors(h, s, l, a, format),
  };
}

export function createAnalogousColors(color: ColorInput, angle = 30, count = 2): string[] {
  const { format, h, s, l, a } = requireParsed(color);
  return generateAnalogousColors(
    h,
    s,
    l,
    a,
    format,
    requireAnalogousAngle(angle),
    requireAnalogousCount(count)
  );
}

export function getComplementaryColor(color: ColorInput): string {
  const { format, h, s, l, a } = requireParsed(color);
  return generateComplementaryColor(h, s, l, a, format);
}

export function getSplitComplementaryColors(color: ColorInput): string[] {
  const { format, h, s, l, a } = requireParsed(color);
  return generateSplitComplementaryColors(h, s, l, a, format);
}

export function getTriadicColors(color: ColorInput): string[] {
  const { format, h, s, l, a } = requireParsed(color);
  return generateTriadicColors(h, s, l, a, format);
}

export function getTetradicColors(color: ColorInput): string[] {
  const { format, h, s, l, a } = requireParsed(color);
  return generateTetradicColors(h, s, l, a, format);
}

function generateAnalogousColors(
  h: number,
  s: number,
  l: number,
  a: number,
  format: ColorFormat,
  angle: number,
  count: number
): string[] {
  if (!Number.isFinite(angle)) {
    throw new Error('Analogous angle must be a finite number');
  }
  const results: string[] = [];
  const startAngle = h - (angle * count) / 2;

  for (let i = 0; i < count; i++) {
    const newHue = normalizeHue(startAngle + (i + 1) * ((angle * count) / (count + 1)));
    results.push(formatColor(newHue, s, l, a, format));
  }

  return results;
}

function generateComplementaryColor(h: number, s: number, l: number, a: number, format: ColorFormat): string {
  return formatColor(normalizeHue(h + 180), s, l, a, format);
}

function generateSplitComplementaryColors(h: number, s: number, l: number, a: number, format: ColorFormat): string[] {
  return [formatColor(normalizeHue(h + 150), s, l, a, format), formatColor(normalizeHue(h + 210), s, l, a, format)];
}

function generateTriadicColors(h: number, s: number, l: number, a: number, format: ColorFormat): string[] {
  return [formatColor(normalizeHue(h + 120), s, l, a, format), formatColor(normalizeHue(h + 240), s, l, a, format)];
}

function generateTetradicColors(h: number, s: number, l: number, a: number, format: ColorFormat): string[] {
  return [
    formatColor(normalizeHue(h + 90), s, l, a, format),
    formatColor(normalizeHue(h + 180), s, l, a, format),
    formatColor(normalizeHue(h + 270), s, l, a, format),
  ];
}

/** Parse a CSS color string into HSL components. */
export function parseColor(color: ColorInput): ParsedColor | null {
  const trimmed = color.trim();
  if (trimmed.startsWith('#')) {
    if (!HEX_PATTERN.test(trimmed)) return null;
    return parseHexColor(trimmed);
  }

  const rgbMatch = trimmed.match(RGB_PATTERN);
  if (rgbMatch) {
    return parseRgbColor(rgbMatch);
  }

  const hslMatch = trimmed.match(HSL_PATTERN);
  if (hslMatch) {
    return parseHslColor(hslMatch);
  }

  return null;
}

function parseHexColor(color: string): ParsedColor | null {
  const hex = color.slice(1);
  let r: number;
  let g: number;
  let b: number;
  let a = 1;

  if (hex.length === 3 || hex.length === 4) {
    const rCh = hex[0];
    const gCh = hex[1];
    const bCh = hex[2];
    if (!rCh || !gCh || !bCh) return null;
    r = parseInt(rCh + rCh, 16);
    g = parseInt(gCh + gCh, 16);
    b = parseInt(bCh + bCh, 16);
    const aCh = hex[3];
    if (hex.length === 4 && aCh) {
      a = parseInt(aCh + aCh, 16) / 255;
    }
  } else if (hex.length === 6 || hex.length === 8) {
    r = parseInt(hex.slice(0, 2), 16);
    g = parseInt(hex.slice(2, 4), 16);
    b = parseInt(hex.slice(4, 6), 16);
    if (hex.length === 8) {
      a = parseInt(hex.slice(6, 8), 16) / 255;
    }
  } else {
    return null;
  }

  if ([r, g, b, a].some((n) => Number.isNaN(n))) return null;

  const { h, s, l } = rgbToHsl(r, g, b);
  const format: ColorFormat = a < 1 ? 'rgba' : 'hex';
  return { format, h, s, l, a, original: color };
}

function parseRgbColor(match: RegExpMatchArray): ParsedColor | null {
  const rRaw = match[1];
  const gRaw = match[2];
  const bRaw = match[3];
  if (rRaw == null || gRaw == null || bRaw == null) return null;

  const r = parseInt(rRaw, 10);
  const g = parseInt(gRaw, 10);
  const b = parseInt(bRaw, 10);
  const a = match[4] != null ? parseFloat(match[4]) : 1;
  if ([r, g, b, a].some((n) => !Number.isFinite(n))) return null;
  if (r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) return null;
  if (a < 0 || a > 1) return null;

  const { h, s, l } = rgbToHsl(r, g, b);
  const format: ColorFormat = a < 1 ? 'rgba' : 'rgb';
  return { format, h, s, l, a, original: match[0] };
}

function parseHslColor(match: RegExpMatchArray): ParsedColor | null {
  const hRaw = match[1];
  const sRaw = match[2];
  const lRaw = match[3];
  if (hRaw == null || sRaw == null || lRaw == null) return null;

  const h = parseFloat(hRaw);
  const s = parseFloat(sRaw);
  const l = parseFloat(lRaw);
  const a = match[4] != null ? parseFloat(match[4]) : 1;
  if ([h, s, l, a].some((n) => !Number.isFinite(n))) return null;
  if (s < 0 || s > 100 || l < 0 || l > 100 || a < 0 || a > 1) return null;

  const format: ColorFormat = a < 1 ? 'hsla' : 'hsl';
  return { format, h: normalizeHue(h), s, l, a, original: match[0] };
}

function rgbToHsl(r: number, g: number, b: number): HslTriple {
  const rf = r / 255;
  const gf = g / 255;
  const bf = b / 255;

  const max = Math.max(rf, gf, bf);
  const min = Math.min(rf, gf, bf);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case rf:
        h = ((gf - bf) / d + (gf < bf ? 6 : 0)) / 6;
        break;
      case gf:
        h = ((bf - rf) / d + 2) / 6;
        break;
      case bf:
        h = ((rf - gf) / d + 4) / 6;
        break;
      default:
        h = 0;
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

export function hslToRgb(h: number, s: number, l: number): RgbTriple {
  if (!Number.isFinite(h) || !Number.isFinite(s) || !Number.isFinite(l)) {
    throw new Error('HSL components must be finite numbers');
  }
  if (s < 0 || s > 100 || l < 0 || l > 100) {
    throw new Error('Saturation and lightness must be in the 0–100 range');
  }

  const hNorm = normalizeHue(h) / 360;
  const sNorm = s / 100;
  const lNorm = l / 100;

  if (sNorm === 0) {
    const channel = Math.round(lNorm * 255);
    return { r: channel, g: channel, b: channel };
  }

  const hue2rgb = (p: number, q: number, t: number): number => {
    let tNorm = t;
    if (tNorm < 0) tNorm += 1;
    if (tNorm > 1) tNorm -= 1;
    if (tNorm < 1 / 6) return p + (q - p) * 6 * tNorm;
    if (tNorm < 1 / 2) return q;
    if (tNorm < 2 / 3) return p + (q - p) * (2 / 3 - tNorm) * 6;
    return p;
  };

  const q = lNorm < 0.5 ? lNorm * (1 + sNorm) : lNorm + sNorm - lNorm * sNorm;
  const p = 2 * lNorm - q;

  return {
    r: Math.round(hue2rgb(p, q, hNorm + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, hNorm) * 255),
    b: Math.round(hue2rgb(p, q, hNorm - 1 / 3) * 255),
  };
}

export function normalizeHue(hue: number): number {
  return ((hue % 360) + 360) % 360;
}

export function formatColor(h: number, s: number, l: number, a: number, format: ColorFormat): string {
  if (![h, s, l, a].every(Number.isFinite)) {
    throw new Error('Color components must be finite numbers');
  }
  const normalizedH = normalizeHue(h);
  const clampedS = Math.max(0, Math.min(100, s));
  const clampedL = Math.max(0, Math.min(100, l));
  const clampedA = Math.max(0, Math.min(1, a));
  const rgb = hslToRgb(normalizedH, clampedS, clampedL);
  const roundedH = Math.round(normalizedH);
  const roundedS = Math.round(clampedS);
  const roundedL = Math.round(clampedL);

  switch (format) {
    case 'hex': {
      const hexR = rgb.r.toString(16).padStart(2, '0');
      const hexG = rgb.g.toString(16).padStart(2, '0');
      const hexB = rgb.b.toString(16).padStart(2, '0');
      if (clampedA < 1) {
        const alphaHex = Math.round(clampedA * 255)
          .toString(16)
          .padStart(2, '0');
        return `#${hexR}${hexG}${hexB}${alphaHex}`;
      }
      return `#${hexR}${hexG}${hexB}`;
    }
    case 'rgb':
      return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
    case 'rgba':
      return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${clampedA})`;
    case 'hsl':
      return `hsl(${roundedH}, ${roundedS}%, ${roundedL}%)`;
    case 'hsla':
      return `hsla(${roundedH}, ${roundedS}%, ${roundedL}%, ${clampedA})`;
    default: {
      const exhaustive: never = format;
      return exhaustive;
    }
  }
}
