/**
 * Re-export color utilities from `@tgmc/theme`.
 * Prefer {@link Color} for create / manipulate / convert / lookup.
 */
export {
  Color,
  addAlpha,
  adjustLightness,
  baseColors,
  darken,
  Color as default,
  defaultCssVariables,
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
} from '@tgmc/theme';
export type { Hsl, Rgb } from '@tgmc/theme';
