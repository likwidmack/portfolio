/**
 * JavaScript mirror of SCSS color tokens in `@tgmc/theme/scss/tokens`.
 */

import { resolveButtonForeground } from './contrast.js';

export type Rgb = {
  r: number;
  g: number;
  b: number;
};

export type Hsl = {
  h: number;
  s: number;
  l: number;
};

type ThemeColorSet = {
  text: string;
  background: string;
  backgroundSecondary: string;
  primary: string;
  secondary: string;
};

export const baseColors = {
  white: '#ffffff',
  black: '#000000',
  grayLt: 'rgb(205, 205, 205)',
  grayMd: 'rgb(128, 128, 128)',
  grayDk: 'rgb(50, 50, 50)',
  blue: 'rgb(0, 0, 255)',
  red: 'rgb(255, 0, 0)',
  green: 'rgb(0, 255, 0)',
  magenta: 'rgb(255, 0, 255)',
  cyan: 'rgb(0, 255, 255)',
  yellow: 'rgb(255, 255, 0)',
} as const;

export const palettes = {
  brightSkySunset: {
    pastelBlue: '#c8e8fc',
    pastelPink: '#ffecf0',
    softWhite: '#ffdee4',
  },
  darkNightGoldenDay: {
    blackPearl: '#001a26',
    darkTarawera: '#053752',
    thanksgivingOrange: '#ef810e',
    wattleYellow: '#e5de44',
  },
  pastelDayNight: {
    skyBlue: '#6696ba',
    paleYellow: '#e2e38b',
    softOrange: '#e7a553',
    mutedMagenta: '#7e4b68',
    deepIndigo: '#292965',
  },
  midnightMagic: {
    darkAmethyst: '#3a015c',
    deepPurple: '#4f0147',
    midnightViolet: '#35012c',
    midnightVioletDk: '#11001c',
  },
} as const;

export const semanticColors = {
  success: '#1b7a7a',
  warning: '#ff8c61',
  alert: '#c1440e',
  error: '#c1440e',
  info: '#0a0aef',
} as const;

export const themeColors = {
  light: {
    text: '#1c1412',
    background: '#faf6f3',
    backgroundSecondary: '#f0e9e4',
    primary: '#d9531d',
    secondary: '#6e1622',
  },
  dark: {
    text: '#f2ece8',
    background: '#0f0908',
    backgroundSecondary: '#16100e',
    primary: '#ff6b35',
    secondary: '#8b1e2e',
  },
} as const satisfies Record<'light' | 'dark', ThemeColorSet>;

type ThemeKey = keyof (typeof themeColors)['light'];

/** Shared CSS custom-property keys for both color modes (aligned with `scss/globals/_root.scss`). */
export type ThemeCssVariableMap = {
  '--primary-color': string;
  '--primary-default': string;
  '--primary-hover': string;
  '--secondary-color': string;
  '--tertiary-color': string;
  '--text-color': string;
  '--text-secondary-color': string;
  '--main-background': string;
  '--main-background-secondary': string;
  '--surface-color': string;
  '--surface-variant': string;
  '--border-color': string;
  '--focus-ring': string;
  '--accent-color': string;
  '--success': string;
  '--warning': string;
  '--error': string;
  '--info': string;
  '--border-radius-md': string;
  '--form-background': string;
  '--form-background-disabled': string;
  '--form-border-color': string;
  '--form-placeholder': string;
  '--form-focus-ring': string;
  '--form-invalid-color': string;
  '--button-fg': string;
};

/** Dark mode CSS custom properties (document default / `:root`). */
export const darkCssVariables = {
  '--primary-color': themeColors.dark.primary,
  '--primary-default': '#ff6b35',
  '--primary-hover': '#ff8c61',
  '--secondary-color': themeColors.dark.secondary,
  '--tertiary-color': '#9e2a3a',
  '--text-color': themeColors.dark.text,
  '--text-secondary-color': '#baa8a0',
  '--main-background': themeColors.dark.background,
  '--main-background-secondary': themeColors.dark.backgroundSecondary,
  '--surface-color': '#16100e',
  '--surface-variant': '#1c1412',
  '--border-color': 'rgba(255, 255, 255, 0.08)',
  '--focus-ring': '#ff6b35',
  '--accent-color': '#ff6b35',
  '--success': semanticColors.success,
  '--warning': semanticColors.warning,
  '--error': semanticColors.error,
  '--info': '#75b8ff',
  '--border-radius-md': '0.5rem',
  '--form-background': 'rgba(0, 0, 0, 0.5)',
  '--form-background-disabled': 'rgba(128, 128, 128, 0.18)',
  '--form-border-color': 'rgba(205, 205, 205, 0.4)',
  '--form-placeholder': 'rgba(186, 168, 160, 0.9)',
  '--form-focus-ring': '#ff6b35',
  '--form-invalid-color': '#c1440e',
  '--button-fg': resolveButtonForeground('dark', themeColors.dark.primary, themeColors.dark.secondary),
} as const satisfies ThemeCssVariableMap;

/** Light mode CSS custom properties (`:root[data-theme='light']`). */
export const lightCssVariables = {
  '--primary-color': themeColors.light.primary,
  '--primary-default': '#d9531d',
  '--primary-hover': '#b73c34',
  '--secondary-color': themeColors.light.secondary,
  '--tertiary-color': '#360a14',
  '--text-color': themeColors.light.text,
  '--text-secondary-color': '#5a4a42',
  '--main-background': themeColors.light.background,
  '--main-background-secondary': themeColors.light.backgroundSecondary,
  '--surface-color': '#f0e9e4',
  '--surface-variant': '#e6dcd5',
  '--border-color': 'rgba(0, 0, 0, 0.08)',
  '--focus-ring': '#d9531d',
  '--accent-color': '#d9531d',
  '--success': '#146060',
  '--warning': '#c26a1f',
  '--error': '#b33a0f',
  '--info': '#245ea8',
  '--border-radius-md': '0.5rem',
  '--form-background': 'color-mix(in srgb, rgb(128, 128, 128) 8%, transparent)',
  '--form-background-disabled': 'color-mix(in srgb, rgb(128, 128, 128) 18%, transparent)',
  '--form-border-color': 'rgba(205, 205, 205, 0.4)',
  '--form-placeholder': 'color-mix(in srgb, rgb(90, 74, 66) 85%, transparent)',
  '--form-focus-ring': '#d9531d',
  '--form-invalid-color': '#b33a0f',
  '--button-fg': resolveButtonForeground('light', themeColors.light.primary, themeColors.light.secondary),
} as const satisfies ThemeCssVariableMap;

/** @deprecated Prefer `darkCssVariables` — alias kept for existing call sites. */
export const defaultCssVariables = darkCssVariables;

/** Returns the CSS variable map for a resolved color mode. */
export function getCssVariablesForMode(mode: 'light' | 'dark'): ThemeCssVariableMap {
  return mode === 'light' ? { ...lightCssVariables } : { ...darkCssVariables };
}

export class Color {
  constructor(public readonly theme: 'light' | 'dark' = 'light') {}

  get primaryColors() {
    return {
      default: getThemeColor('primary', this.theme === 'light'),
      secondary: getThemeColor('secondary', this.theme === 'light'),
    };
  }

  static getThemeColor(key: ThemeKey, isDark = false): string {
    return getThemeColor(key, isDark) || '#000000';
  }

  static lighten(hex: string, weight: number): string {
    return lighten(hex, weight);
  }

  static darken(hex: string, weight: number): string {
    return darken(hex, weight);
  }

  static addAlpha(hex: string, opacity: number): string {
    return addAlpha(hex, opacity);
  }

  static isLight(hex: string): boolean {
    const rgb = hexToRgb(hex);
    if (!rgb) return false;
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    return hsl.l > 50;
  }

  static getContrastColor(bgColor: string): string {
    return this.isLight(bgColor) ? baseColors.black : baseColors.white;
  }
}

export default Color;

export function getThemeColor(key: ThemeKey, isDark = false): string | null {
  const theme = isDark ? themeColors.dark : themeColors.light;
  return theme[key] || null;
}

export function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;

  const a = s * Math.min(l, 1 - l);
  const f = (n: number): string => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0');
  };

  return `#${f(0)}${f(8)}${f(4)}`;
}

function parseHexPair(hex: string): Rgb | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result?.[1] || !result[2] || !result[3]) return null;
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

function parseHexShorthand(hex: string): Rgb | null {
  const result = /^#?([a-f\d])([a-f\d])([a-f\d])$/i.exec(hex);
  if (!result?.[1] || !result[2] || !result[3]) return null;
  return {
    r: parseInt(result[1] + result[1], 16),
    g: parseInt(result[2] + result[2], 16),
    b: parseInt(result[3] + result[3], 16),
  };
}

export function hexToRgb(hex: string): Rgb | null {
  return parseHexPair(hex) ?? parseHexShorthand(hex);
}

export function rgbToHex(r: number, g: number, b: number) {
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

export function rgbToHsl(r: number, g: number, b: number): Hsl {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export function adjustLightness(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  hsl.l = Math.max(0, Math.min(100, hsl.l + amount));
  return hslToHex(hsl.h, hsl.s, hsl.l);
}

export function lighten(hex: string, weight: number): string {
  return adjustLightness(hex, weight);
}

export function darken(hex: string, weight: number): string {
  return adjustLightness(hex, -weight);
}

export function addAlpha(hex: string, opacity: number): string {
  const _opacity = Math.round(Math.min(Math.max(opacity || 0, 0), 1) * 255);
  return hex + _opacity.toString(16).toUpperCase().padStart(2, '0');
}

export function updateRgbAlpha(rgbStr: string, opacity: number): string {
  const rgba = rgbStr.match(/\d+(\.\d+)?/g);
  if (!rgba || rgba.length < 3) return rgbStr;
  return `rgba(${rgba[0]}, ${rgba[1]}, ${rgba[2]}, ${opacity})`;
}
