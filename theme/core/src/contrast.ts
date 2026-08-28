/**
 * On-fill contrast helpers — ink must read against BOTH an opaque
 * `background-color` and any `background-image` gradient stops layered on top.
 */

export type ContrastRgb = {
  r: number;
  g: number;
  b: number;
};

export const ON_FILL_INK_DARK = '#0f172a';
export const ON_FILL_INK_LIGHT = '#eaf2ff';

function hexToRgbLocal(hex: string): ContrastRgb | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (result?.[1] && result[2] && result[3]) {
    return {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    };
  }

  const short = /^#?([a-f\d])([a-f\d])([a-f\d])$/i.exec(hex.trim());
  if (!short?.[1] || !short[2] || !short[3]) {
    return null;
  }

  return {
    r: parseInt(short[1] + short[1], 16),
    g: parseInt(short[2] + short[2], 16),
    b: parseInt(short[3] + short[3], 16),
  };
}

/** Relative luminance (WCAG) for an sRGB triple in 0–255. */
export function relativeLuminance(rgb: ContrastRgb): number {
  const channel = (value: number): number => {
    const s = value / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

/** Parse `#rgb` / `#rrggbb` / `rgb()` / `rgba()` into an RGB triple. */
export function parseCssColor(input: string): ContrastRgb | null {
  const trimmed = input.trim();
  const hex = hexToRgbLocal(trimmed);
  if (hex) {
    return hex;
  }

  const rgbMatch = /^rgba?\(\s*([.\d]+)\s*[, ]\s*([.\d]+)\s*[, ]\s*([.\d]+)(?:\s*[,/]\s*[.\d]+\s*)?\)$/i.exec(trimmed);
  if (!rgbMatch) {
    return null;
  }

  const r = Number(rgbMatch[1]);
  const g = Number(rgbMatch[2]);
  const b = Number(rgbMatch[3]);
  if ([r, g, b].some((n) => Number.isNaN(n))) {
    return null;
  }

  return { r, g, b };
}

/**
 * Extract color stops from a CSS `background-image` gradient value.
 * Ignores angles, `to …` directions, and transparent/`none` entries.
 */
export function parseGradientColorStops(backgroundImage: string | undefined | null): string[] {
  if (!backgroundImage || backgroundImage === 'none') {
    return [];
  }

  const stops: string[] = [];
  const colorToken = /#(?:[a-f\d]{3}|[a-f\d]{6}|[a-f\d]{8})\b|rgba?\([^)]+\)|hsla?\([^)]+\)|color-mix\([^)]+\)/gi;
  for (const match of backgroundImage.matchAll(colorToken)) {
    const token = match[0];
    if (/transparent/i.test(token)) {
      continue;
    }
    stops.push(token);
  }
  return stops;
}

export type FillContrastInput = {
  /** Opaque `background-color` (required luminance anchor). */
  backgroundColor: string;
  /** Optional `background-image`, typically a `linear-gradient(...)`. */
  backgroundImage?: string | null;
  lightInk?: string;
  darkInk?: string;
};

/**
 * Pick on-fill ink by comparing WCAG contrast of candidate inks against the
 * solid `background-color` AND every parseable gradient stop. Chooses the ink
 * with the better worst-case ratio across that fill stack.
 */
export function contrastRatio(foreground: ContrastRgb, background: ContrastRgb): number {
  const L1 = relativeLuminance(foreground);
  const L2 = relativeLuminance(background);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

function collectFillBackgrounds(input: FillContrastInput): ContrastRgb[] {
  const backgrounds: ContrastRgb[] = [];
  const base = parseCssColor(input.backgroundColor);
  if (base) {
    backgrounds.push(base);
  }
  for (const stop of parseGradientColorStops(input.backgroundImage)) {
    const rgb = parseCssColor(stop);
    if (rgb) {
      backgrounds.push(rgb);
    }
  }
  return backgrounds;
}

function worstContrastRatio(fg: ContrastRgb, backgrounds: ContrastRgb[]): number {
  return Math.min(...backgrounds.map((bg) => contrastRatio(fg, bg)));
}

export function pickContrastingInk(input: FillContrastInput): string {
  const lightInk = input.lightInk ?? ON_FILL_INK_LIGHT;
  const darkInk = input.darkInk ?? ON_FILL_INK_DARK;
  const backgrounds = collectFillBackgrounds(input);
  if (backgrounds.length === 0) {
    return darkInk;
  }

  const lightFg = parseCssColor(lightInk);
  const darkFg = parseCssColor(darkInk);
  if (!lightFg || !darkFg) {
    return darkInk;
  }

  return worstContrastRatio(lightFg, backgrounds) >= worstContrastRatio(darkFg, backgrounds) ? lightInk : darkInk;
}

/** Build the default mode button gradient used alongside `--primary-color`. */
export function defaultButtonGradient(primary: string, secondary: string): string {
  return `linear-gradient(135deg, ${secondary} 0%, ${primary} 100%)`;
}

/** Resolve `--button-fg` for a mode from solid primary + secondary gradient stops. */
export function resolveButtonForeground(_mode: 'light' | 'dark', primary: string, secondary: string): string {
  return pickContrastingInk({
    backgroundColor: primary,
    backgroundImage: defaultButtonGradient(primary, secondary),
  });
}
