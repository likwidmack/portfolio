/**
 * Unified Color facade for `@tgmc/theme`.
 * Create / parse, manipulate, convert, and look up named colors.
 * Invalid parse returns `null`; {@link Color.create} throws.
 */

import type {
  AnalogousOptions,
  ColorFormat,
  ColorInput,
  HarmonyPalette,
  ParsedColor,
  RgbTriple,
} from './color-palette.js';
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
} from './color-palette.js';
import type { ColorPaletteQuality, ColorQuality } from './color-quality.js';
import { analyzeColorQuality, analyzePaletteQuality, calculateContrastRatio, enhanceColor } from './color-quality.js';
import { DEFAULT_PAPER_INK } from './paper-ink.js';
import type { Hsl, Rgb } from './tokens.js';
import {
  addAlpha,
  adjustLightness,
  baseColors,
  darken,
  getThemeColor,
  hexToRgb,
  hslToHex,
  lighten,
  namedColors,
  palettes,
  rgbToHex,
  rgbToHsl,
  semanticColors,
  themeColors,
  updateRgbAlpha,
} from './tokens.js';

export type ThemeRoleKey = keyof (typeof themeColors)['light'];
export type ThemeModeName = 'light' | 'dark';
export type BaseColorKey = keyof typeof baseColors;
export type SemanticColorKey = keyof typeof semanticColors;
export type PaletteName = keyof typeof palettes;

/** Optional secondary/accent overrides when resolving brand roles from a primary. */
export type BrandRoleOverrides = {
  secondary?: ColorInput;
  accent?: ColorInput;
};

/** Primary + harmony-derived (or overridden) secondary and accent hexes. */
export type ResolvedBrandRoles = {
  primary: string;
  secondary: string;
  accent: string;
};

/** Flat swatch for Personalize / tooling color pickers. */
export type BrandSwatch = {
  id: string;
  label: string;
  hex: string;
  group: string;
};

export type ColorLookup =
  | { kind: 'base'; name: BaseColorKey }
  | { kind: 'semantic'; name: SemanticColorKey }
  | { kind: 'role'; name: ThemeRoleKey; mode?: ThemeModeName }
  | { kind: 'palette'; palette: PaletteName; swatch: string };

const BROAD_ANALOGOUS_DEGREES = [60, 48, 36] as const;
const MIN_ROLE_SEPARATION = 3;
const MIN_INK_CONTRAST = 4.5;

function inkPasses(candidate: string): boolean {
  const onWhite = Color.contrastRatio(candidate, '#ffffff');
  const onBlack = Color.contrastRatio(candidate, '#000000');
  return Math.max(onWhite, onBlack) >= MIN_INK_CONTRAST;
}

function paperContrasts(candidate: string): { light: number; dark: number } {
  return {
    light: Color.contrastRatio(candidate, DEFAULT_PAPER_INK.light.paper),
    dark: Color.contrastRatio(candidate, DEFAULT_PAPER_INK.dark.paper),
  };
}

function passesBrandCompliance(primary: string, candidate: string): boolean {
  if (Color.contrastRatio(primary, candidate) < MIN_ROLE_SEPARATION) return false;
  if (!inkPasses(candidate)) return false;
  const papers = paperContrasts(candidate);
  return papers.light >= MIN_ROLE_SEPARATION && papers.dark >= MIN_ROLE_SEPARATION;
}

/**
 * Colorfulness peaks at a saturated mid lightness and falls to 0 at black, white, and gray.
 * When blackness or whiteness exceeds it, the color reads as black or white more than as a hue.
 */
function neutralWeight(
  saturation: number,
  lightness: number
): { colorfulness: number; blackness: number; whiteness: number } {
  const colorfulness = (saturation * Math.min(lightness, 100 - lightness)) / 50;
  return { colorfulness, blackness: 100 - lightness, whiteness: lightness };
}

/** Widest analogous secondary. Near black the hue swings negative and the partner is lighter; near white the hue swings positive and the partner is darker. */
function broadAnalogousSecondary(primaryHex: string): string {
  const parsed = parseColor(primaryHex);
  if (!parsed) return primaryHex;
  const { colorfulness, blackness, whiteness } = neutralWeight(parsed.s, parsed.l);
  const moreBlack = blackness > whiteness && blackness > colorfulness;
  const moreWhite = whiteness > blackness && whiteness > colorfulness;
  const signs: Array<1 | -1> = moreBlack ? [-1, 1] : moreWhite ? [1, -1] : [1, -1];
  const lightnesses: number[] = [];
  if (moreBlack) {
    for (let lightness = 92; lightness >= Math.min(92, parsed.l + 16); lightness -= 2) lightnesses.push(lightness);
  } else if (moreWhite) {
    for (let lightness = 8; lightness <= Math.max(8, parsed.l - 16); lightness += 2) lightnesses.push(lightness);
  } else {
    for (let lightness = 8; lightness <= 92; lightness += 2) lightnesses.push(lightness);
  }
  let best = primaryHex;
  let bestScore = 0;
  for (const degrees of BROAD_ANALOGOUS_DEGREES) {
    for (const sign of signs) {
      for (const lightness of lightnesses) {
        const candidate = formatColor(normalizeHue(parsed.h + sign * degrees), parsed.s, lightness, parsed.a, 'hex');
        const againstPrimary = Color.contrastRatio(primaryHex, candidate);
        const papers = paperContrasts(candidate);
        const score = Math.min(againstPrimary, papers.light, papers.dark);
        if (againstPrimary >= MIN_ROLE_SEPARATION && inkPasses(candidate) && score > bestScore) {
          best = candidate;
          bestScore = score;
        }
        if (passesBrandCompliance(primaryHex, candidate)) return candidate;
      }
    }
  }
  return best;
}

/**
 * Instance + static Color API.
 * Prefer static helpers for parse/manipulate/convert/lookup.
 * Construct with a mode when reading theme role colors via {@link Color#primaryColors}.
 */
export class Color {
  constructor(public readonly theme: ThemeModeName = 'light') {}

  get primaryColors() {
    return {
      default: Color.get('primary', this.theme) ?? baseColors.black,
      secondary: Color.get('secondary', this.theme) ?? baseColors.black,
    };
  }

  /** Parse a CSS color string. Returns `null` when invalid. */
  static parse(color: ColorInput): ParsedColor | null {
    return parseColor(color);
  }

  /**
   * Create a parsed color or throw.
   * @throws {Error} when the input is not a supported CSS color string
   */
  static create(color: ColorInput): ParsedColor {
    const parsed = parseColor(color);
    if (!parsed) {
      throw new Error(`Invalid color format: ${color}`);
    }
    return parsed;
  }

  static isValid(color: string): boolean {
    return isValidColorFormat(color);
  }

  static lighten(hex: string, weight: number): string {
    return lighten(hex, weight);
  }

  static darken(hex: string, weight: number): string {
    return darken(hex, weight);
  }

  static adjustLightness(hex: string, amount: number): string {
    return adjustLightness(hex, amount);
  }

  static addAlpha(hex: string, opacity: number): string {
    return addAlpha(hex, opacity);
  }

  static updateRgbAlpha(rgbStr: string, opacity: number): string {
    return updateRgbAlpha(rgbStr, opacity);
  }

  static hexToRgb(hex: string): Rgb | null {
    return hexToRgb(hex);
  }

  static rgbToHex(r: number, g: number, b: number): string {
    return rgbToHex(r, g, b);
  }

  static rgbToHsl(r: number, g: number, b: number): Hsl {
    return rgbToHsl(r, g, b);
  }

  static hslToHex(h: number, s: number, l: number): string {
    return hslToHex(h, s, l);
  }

  static hslToRgb(h: number, s: number, l: number): RgbTriple {
    return hslToRgb(h, s, l);
  }

  static format(h: number, s: number, l: number, a: number, format: ColorFormat): string {
    return formatColor(h, s, l, a, format);
  }

  static normalizeHue(hue: number): number {
    return normalizeHue(hue);
  }

  static harmony(color: ColorInput, options?: AnalogousOptions): HarmonyPalette {
    return createColorPalette(color, options);
  }

  static analogous(color: ColorInput, angle?: number, count?: number): string[] {
    return createAnalogousColors(color, angle, count);
  }

  static complementary(color: ColorInput): string {
    return getComplementaryColor(color);
  }

  /**
   * Brand accent from a primary — complementary hue.
   * Matches Sass `theme-complementary` for the same solid primary (see CONCEPTS brand role harmony).
   */
  static brandAccent(primary: ColorInput): string {
    return getComplementaryColor(primary);
  }

  /**
   * Analogous candidates for a brand secondary from primary.
   * Hand-tuned `$secondary-color-*` tokens may differ; use this for tooling / previews.
   */
  static brandSecondaryCandidates(primary: ColorInput, angle?: number, count?: number): string[] {
    return createAnalogousColors(primary, angle, count);
  }

  /** Normalize any supported CSS color string to `#rrggbb[aa]` hex. */
  static toHex(color: ColorInput): string {
    const parsed = Color.create(color);
    return formatColor(parsed.h, parsed.s, parsed.l, parsed.a, 'hex');
  }

  /**
   * Resolve brand roles from primary with optional secondary/accent overrides.
   * Default secondary is a broad analogous hue (60°, then 48°, then 36°). Near black the hue swings negative; near white it swings positive. Accent stays complementary.
   */
  static resolveBrandRoles(primary: ColorInput, overrides?: BrandRoleOverrides): ResolvedBrandRoles {
    const primaryHex = Color.toHex(primary);
    const secondary = overrides?.secondary ? Color.toHex(overrides.secondary) : broadAnalogousSecondary(primaryHex);
    const accent = overrides?.accent ? Color.toHex(overrides.accent) : Color.toHex(Color.brandAccent(primaryHex));
    return { primary: primaryHex, secondary, accent };
  }

  /**
   * Flat swatch catalog for UI pickers: theme roles, semantics, and named palettes.
   */
  static brandSwatchCatalog(): BrandSwatch[] {
    const swatches: BrandSwatch[] = [];

    for (const mode of ['light', 'dark'] as const) {
      const roles = themeColors[mode];
      for (const [name, hex] of Object.entries(roles)) {
        swatches.push({
          id: `role-${mode}-${name}`,
          label: `${name} (${mode})`,
          hex: Color.toHex(hex),
          group: `Theme roles · ${mode}`,
        });
      }
    }

    for (const [name, hex] of Object.entries(semanticColors)) {
      swatches.push({
        id: `semantic-${name}`,
        label: name,
        hex: Color.toHex(hex),
        group: 'Semantic',
      });
    }

    for (const [paletteName, pack] of Object.entries(palettes)) {
      for (const [swatchName, hex] of Object.entries(pack)) {
        swatches.push({
          id: `palette-${paletteName}-${swatchName}`,
          label: swatchName,
          hex: Color.toHex(hex),
          group: paletteName,
        });
      }
    }

    return swatches;
  }

  static splitComplementary(color: ColorInput): string[] {
    return getSplitComplementaryColors(color);
  }

  static triadic(color: ColorInput): string[] {
    return getTriadicColors(color);
  }

  static tetradic(color: ColorInput): string[] {
    return getTetradicColors(color);
  }

  static quality(color: ColorInput): ColorQuality {
    return analyzeColorQuality(color);
  }

  static paletteQuality(colors: ColorInput[]): ColorPaletteQuality {
    return analyzePaletteQuality(colors);
  }

  static contrastRatio(a: ColorInput, b: ColorInput): number {
    return calculateContrastRatio(a, b);
  }

  static enhance(color: ColorInput): string {
    return enhanceColor(color);
  }

  static isLight(hex: string): boolean {
    const rgb = hexToRgb(hex);
    if (!rgb) return false;
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    return hsl.l > 50;
  }

  static getContrastColor(bgColor: string): string {
    return Color.isLight(bgColor) ? baseColors.black : baseColors.white;
  }

  /** @deprecated Prefer {@link Color.get}. */
  static getThemeColor(key: ThemeRoleKey, isDark = false): string | null {
    return Color.get(key, isDark ? 'dark' : 'light');
  }

  /**
   * Look up a theme role color for a mode.
   * Unknown roles return `null`.
   */
  static get(key: ThemeRoleKey, mode: ThemeModeName = 'light'): string | null {
    return Object.hasOwn(themeColors[mode], key) ? getThemeColor(key, mode === 'dark') : null;
  }

  static getBase(name: BaseColorKey): string {
    return baseColors[name];
  }

  static getSemantic(name: SemanticColorKey): string {
    return semanticColors[name];
  }

  static getPalette(name: PaletteName): (typeof palettes)[PaletteName] {
    return palettes[name];
  }

  /**
   * Flat name lookup against the theme JSON library.
   * Precedence: base → semantic → palette swatch → theme role (mode-aware) → named catalog.
   * Unknown names return `null`.
   */
  static named(name: string, mode: ThemeModeName = 'light'): string | null {
    const key = kebabToCamel(name);
    if (Object.hasOwn(baseColors, key)) return baseColors[key as BaseColorKey];
    if (Object.hasOwn(semanticColors, key)) return semanticColors[key as SemanticColorKey];
    for (const pack of Object.values(palettes)) {
      const record = pack as Record<string, string>;
      if (Object.hasOwn(record, key)) return record[key] ?? null;
    }
    if (Object.hasOwn(themeColors.light, key)) {
      return Color.get(key as ThemeRoleKey, mode);
    }
    if (Object.hasOwn(namedColors, key)) return namedColors[key] ?? null;
    return null;
  }

  static lookup(query: ColorLookup): string | null {
    switch (query.kind) {
      case 'base':
        return baseColors[query.name] ?? null;
      case 'semantic':
        return semanticColors[query.name] ?? null;
      case 'role':
        return Color.get(query.name, query.mode ?? 'light');
      case 'palette': {
        const pack = palettes[query.palette] as Record<string, string>;
        return pack[query.swatch] ?? null;
      }
      default: {
        const exhaustive: never = query;
        return exhaustive;
      }
    }
  }
}

function kebabToCamel(name: string): string {
  return name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

export default Color;
