/**
 * JavaScript mirrors of SCSS color tokens — values from `colors.json` only.
 * Inventoried color hex/rgb literals must not appear in this module.
 */

import colorsJson from './colors.json' with { type: 'json' };
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

/** Package color library (Sass-aligned inventoried values + named catalogs). */
export const colorsLibrary = colorsJson;

export const baseColors = colorsJson.base;

export const palettes = colorsJson.palettes;

/** Flat named-color catalog (colors_2 + extended-colors; Sass overrides on conflict). */
export const namedColors = colorsJson.named as Record<string, string>;

/** Wide flat map of Sass-resolvable color tokens from `colors-dump.scss`. */
export const sassColors = colorsJson.sass as Record<string, string>;

/** Mirrors Sass `$success-dark` / `$warning-dark` / `$alert-dark` / `$error-dark` / `$info-light`. */
export const semanticColors = colorsJson.semantic;

/** Mirrors Sass brand + surface roles in `scss/tokens/_colors.scss`. */
export const themeColors = colorsJson.theme as Record<'light' | 'dark', ThemeColorSet>;

type ThemeKey = keyof ThemeColorSet;

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
  /** Accessible interaction roles (AA in both modes; see docs/packages/theme.md → Contrast roles). */
  '--link-color': string;
  '--border-strong': string;
  '--primary-fill': string;
  '--on-primary': string;
  '--success-ink': string;
  '--danger-ink': string;
  /** Status inks (≥ 4.5:1 text) — five-input model. */
  '--warning-ink': string;
  '--error-ink': string;
  '--info-ink': string;
  /** The neutral inputs: lightest ("white") and darkest ("black"). */
  '--paper': string;
  '--ink': string;
};

const darkCss = colorsJson.cssVariables.dark;
const lightCss = colorsJson.cssVariables.light;

/** Non-color layout token — not part of the color inventory. */
const BORDER_RADIUS_MD = '0.5rem';

/** Dark mode CSS custom properties (document default / `:root`). */
export const darkCssVariables = {
  '--primary-color': themeColors.dark.primary,
  '--primary-default': themeColors.dark.primary,
  '--primary-hover': darkCss['--primary-hover'],
  '--secondary-color': themeColors.dark.secondary,
  '--tertiary-color': darkCss['--tertiary-color'],
  '--text-color': themeColors.dark.text,
  '--text-secondary-color': darkCss['--text-secondary-color'],
  '--main-background': themeColors.dark.background,
  '--main-background-secondary': themeColors.dark.backgroundSecondary,
  '--surface-color': darkCss['--surface-color'],
  '--surface-variant': darkCss['--surface-variant'],
  '--border-color': darkCss['--border-color'],
  '--focus-ring': darkCss['--focus-ring'],
  '--accent-color': darkCss['--accent-color'],
  '--success': semanticColors.success,
  '--warning': semanticColors.warning,
  '--error': semanticColors.error,
  '--info': darkCss['--info'],
  '--border-radius-md': BORDER_RADIUS_MD,
  '--form-background': darkCss['--form-background'],
  '--form-background-disabled': darkCss['--form-background-disabled'],
  '--form-border-color': darkCss['--border-strong'],
  '--form-placeholder': darkCss['--form-placeholder'],
  '--form-focus-ring': darkCss['--focus-ring'],
  '--form-invalid-color': darkCss['--form-invalid-color'],
  '--button-fg': resolveButtonForeground('dark', themeColors.dark.primary, themeColors.dark.secondary),
  '--link-color': darkCss['--link-color'],
  '--border-strong': darkCss['--border-strong'],
  '--primary-fill': darkCss['--primary-fill'],
  '--on-primary': darkCss['--on-primary'],
  '--success-ink': darkCss['--success-ink'],
  '--danger-ink': darkCss['--danger-ink'],
  '--warning-ink': darkCss['--warning-ink'],
  '--error-ink': darkCss['--error-ink'],
  '--info-ink': darkCss['--info-ink'],
  '--paper': darkCss['--paper'],
  '--ink': darkCss['--ink'],
} as const satisfies ThemeCssVariableMap;

/** Light mode CSS custom properties (`:root[data-theme='light']`). */
export const lightCssVariables = {
  '--primary-color': themeColors.light.primary,
  '--primary-default': themeColors.light.primary,
  '--primary-hover': lightCss['--primary-hover'],
  '--secondary-color': themeColors.light.secondary,
  '--tertiary-color': lightCss['--tertiary-color'],
  '--text-color': themeColors.light.text,
  '--text-secondary-color': lightCss['--text-secondary-color'],
  '--main-background': themeColors.light.background,
  '--main-background-secondary': themeColors.light.backgroundSecondary,
  '--surface-color': lightCss['--surface-color'],
  '--surface-variant': lightCss['--surface-variant'],
  '--border-color': lightCss['--border-color'],
  '--focus-ring': lightCss['--focus-ring'],
  '--accent-color': lightCss['--accent-color'],
  '--success': lightCss['--success'],
  '--warning': lightCss['--warning'],
  '--error': lightCss['--error'],
  '--info': semanticColors.info,
  '--border-radius-md': BORDER_RADIUS_MD,
  '--form-background': lightCss['--form-background'],
  '--form-background-disabled': lightCss['--form-background-disabled'],
  '--form-border-color': lightCss['--border-strong'],
  '--form-placeholder': lightCss['--form-placeholder'],
  '--form-focus-ring': lightCss['--focus-ring'],
  '--form-invalid-color': lightCss['--form-invalid-color'],
  '--button-fg': resolveButtonForeground('light', themeColors.light.primary, themeColors.light.secondary),
  '--link-color': lightCss['--link-color'],
  '--border-strong': lightCss['--border-strong'],
  '--primary-fill': lightCss['--primary-fill'],
  '--on-primary': lightCss['--on-primary'],
  '--success-ink': lightCss['--success-ink'],
  '--danger-ink': lightCss['--danger-ink'],
  '--warning-ink': lightCss['--warning-ink'],
  '--error-ink': lightCss['--error-ink'],
  '--info-ink': lightCss['--info-ink'],
  '--paper': lightCss['--paper'],
  '--ink': lightCss['--ink'],
} as const satisfies ThemeCssVariableMap;

/** @deprecated Prefer `darkCssVariables` — alias kept for existing call sites. */
export const defaultCssVariables = darkCssVariables;

/** Returns the CSS variable map for a resolved color mode (build-time hex values). */
export function getCssVariablesForMode(mode: 'light' | 'dark'): ThemeCssVariableMap {
  return mode === 'light' ? { ...lightCssVariables } : { ...darkCssVariables };
}

/**
 * Roles the stylesheet derives at runtime from the five inputs (paper / ink → neutral scale,
 * status hue → status inks). They must never be written inline on `:root`: an inline hex would
 * pin the build-time default and a live `--paper` / `--ink` change would stop reaching them.
 * The stylesheet already switches them per mode (`:root` / `[data-theme='light']`).
 */
export const DERIVED_ROLE_TOKENS: ReadonlySet<string> = new Set([
  '--paper',
  '--ink',
  '--main-background',
  '--main-background-secondary',
  '--surface-color',
  '--surface-variant',
  '--text-color',
  '--text-secondary-color',
  '--border-color',
  '--border-strong',
  '--form-border-color',
  '--success-ink',
  '--warning-ink',
  '--error-ink',
  '--info-ink',
  '--danger-ink',
]);

/** A token map without the runtime-derived roles (safe to write inline). */
export function withoutDerivedRoles<T extends Record<string, string>>(tokens: T): Partial<T> {
  return Object.fromEntries(Object.entries(tokens).filter(([key]) => !DERIVED_ROLE_TOKENS.has(key))) as Partial<T>;
}

/** Tokens a colour-mode switch writes inline: the mode map minus the runtime-derived roles. */
export function getInlineTokensForMode(mode: 'light' | 'dark'): Record<string, string> {
  return withoutDerivedRoles(getCssVariablesForMode(mode) as Record<string, string>) as Record<string, string>;
}

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

export function rgbToHex(r: number, g: number, b: number): string {
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
  const alphaByte = Math.round(Math.min(Math.max(opacity || 0, 0), 1) * 255);
  return hex + alphaByte.toString(16).toUpperCase().padStart(2, '0');
}

export function updateRgbAlpha(rgbStr: string, opacity: number): string {
  const rgba = rgbStr.match(/\d+(\.\d+)?/g);
  if (!rgba || rgba.length < 3) return rgbStr;
  return `rgba(${rgba[0]}, ${rgba[1]}, ${rgba[2]}, ${opacity})`;
}
