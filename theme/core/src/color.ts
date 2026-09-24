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

export type ColorLookup =
  | { kind: 'base'; name: BaseColorKey }
  | { kind: 'semantic'; name: SemanticColorKey }
  | { kind: 'role'; name: ThemeRoleKey; mode?: ThemeModeName }
  | { kind: 'palette'; palette: PaletteName; swatch: string };

/**
 * Instance + static Color API.
 * Prefer static helpers for parse/manipulate/convert/lookup.
 * Construct with a mode when reading theme role colors via {@link Color#primaryColors}.
 */
export class Color {
  constructor(public readonly theme: ThemeModeName = 'light') {}

  get primaryColors() {
    return {
      default: Color.get('primary', this.theme),
      secondary: Color.get('secondary', this.theme),
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
  static getThemeColor(key: ThemeRoleKey, isDark = false): string {
    return Color.get(key, isDark ? 'dark' : 'light');
  }

  /**
   * Look up a theme role color for a mode.
   * Unknown roles fall back to `#000000`.
   */
  static get(key: ThemeRoleKey, mode: ThemeModeName = 'light'): string {
    return getThemeColor(key, mode === 'dark') || baseColors.black;
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

  static lookup(query: ColorLookup): string | null {
    switch (query.kind) {
      case 'base':
        return baseColors[query.name];
      case 'semantic':
        return semanticColors[query.name];
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

export default Color;
