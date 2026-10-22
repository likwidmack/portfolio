/**
 * JavaScript mirrors of SCSS color tokens — values from `colors.json` only.
 * Inventoried color hex/rgb literals must not appear in this module.
 */

import { COLOR_RENAME_MAP } from './color-rename.js';
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

/**
 * Shared CSS custom-property keys for both colour modes (aligned with `scss/globals/_root.scss`),
 * under the colour system's `--theme-…-color` names only (Task 8, R-T8c — the old keys are gone;
 * an old key passed to the theme API is normalised with `normalizeColorNames`). The brand, status,
 * focus and button-text entries hold the Sass *source* values; the stylesheet paints their
 * lightness-adjusted variations (`buildColorVariations` / `buildButtonInkTokens` with
 * `DEFAULT_COLOR_SOURCES`), and nothing writes these maps' colours inline
 * (`getInlineTokensForMode`).
 */
export type ThemeCssVariableMap = {
  '--theme-primary-color': string;
  '--theme-secondary-color': string;
  '--theme-accent-color': string;
  '--theme-primary-hover-color': string;
  '--theme-button-fg-color': string;
  /** The active pen & paper pair (the neutral scale runs paper → ink). */
  '--theme-paper-color': string;
  '--theme-ink-color': string;
  '--theme-text-color': string;
  '--theme-text-secondary-color': string;
  '--theme-main-background-color': string;
  '--theme-main-background-secondary-color': string;
  '--theme-surface-color': string;
  '--theme-surface-variant-color': string;
  '--theme-border-color': string;
  /** Accessible interaction roles (AA in both modes; see docs/packages/theme.md → Contrast roles). */
  '--theme-border-strong-color': string;
  '--theme-focus-ring-color': string;
  '--theme-link-color': string;
  '--theme-primary-fill-color': string;
  '--theme-on-primary-color': string;
  /** Status hues and their text inks (≥ 4.5:1). */
  '--theme-success-hue-color': string;
  '--theme-warning-hue-color': string;
  '--theme-error-hue-color': string;
  '--theme-info-hue-color': string;
  '--theme-success-ink-color': string;
  '--theme-warning-ink-color': string;
  '--theme-error-ink-color': string;
  '--theme-info-ink-color': string;
  '--theme-form-background-color': string;
  '--theme-form-background-disabled-color': string;
  '--theme-form-placeholder-color': string;
  '--theme-form-invalid-color': string;
  /**
   * Palette name the owner kept (data, not renamed). The stylesheet declares it on `:root` only
   * (dark value), so the colour-mode writer pins it per mode — see {@link getInlineTokensForMode}.
   * It no longer feeds `--text-shadow-root`; the pin only serves the Theme API (see the TODO).
   */
  '--primary-default': string;
  /** Non-colour layout token — not part of the colour inventory. */
  '--border-radius-md': string;
};

const darkCss = colorsJson.cssVariables.dark;
const lightCss = colorsJson.cssVariables.light;

/** Non-color layout token — not part of the color inventory. */
const BORDER_RADIUS_MD = '0.5rem';

/** Dark mode CSS custom properties (document default / `:root`). */
export const darkCssVariables = {
  '--theme-primary-color': themeColors.dark.primary,
  '--theme-secondary-color': themeColors.dark.secondary,
  '--theme-accent-color': darkCss['--theme-accent-color'],
  '--theme-primary-hover-color': darkCss['--theme-primary-hover-color'],
  '--theme-button-fg-color': resolveButtonForeground('dark', themeColors.dark.primary, themeColors.dark.secondary),
  '--theme-paper-color': darkCss['--theme-paper-color'],
  '--theme-ink-color': darkCss['--theme-ink-color'],
  '--theme-text-color': themeColors.dark.text,
  '--theme-text-secondary-color': darkCss['--theme-text-secondary-color'],
  '--theme-main-background-color': themeColors.dark.background,
  '--theme-main-background-secondary-color': themeColors.dark.backgroundSecondary,
  '--theme-surface-color': darkCss['--theme-surface-color'],
  '--theme-surface-variant-color': darkCss['--theme-surface-variant-color'],
  '--theme-border-color': darkCss['--theme-border-color'],
  '--theme-border-strong-color': darkCss['--theme-border-strong-color'],
  '--theme-focus-ring-color': darkCss['--theme-focus-ring-color'],
  '--theme-link-color': darkCss['--theme-link-color'],
  '--theme-primary-fill-color': darkCss['--theme-primary-fill-color'],
  '--theme-on-primary-color': darkCss['--theme-on-primary-color'],
  '--theme-success-hue-color': semanticColors.success,
  '--theme-warning-hue-color': semanticColors.warning,
  '--theme-error-hue-color': semanticColors.error,
  '--theme-info-hue-color': darkCss['--theme-info-hue-color'],
  '--theme-success-ink-color': darkCss['--theme-success-ink-color'],
  '--theme-warning-ink-color': darkCss['--theme-warning-ink-color'],
  '--theme-error-ink-color': darkCss['--theme-error-ink-color'],
  '--theme-info-ink-color': darkCss['--theme-info-ink-color'],
  '--theme-form-background-color': darkCss['--theme-form-background-color'],
  '--theme-form-background-disabled-color': darkCss['--theme-form-background-disabled-color'],
  '--theme-form-placeholder-color': darkCss['--theme-form-placeholder-color'],
  '--theme-form-invalid-color': darkCss['--theme-form-invalid-color'],
  '--primary-default': themeColors.dark.primary,
  '--border-radius-md': BORDER_RADIUS_MD,
} as const satisfies ThemeCssVariableMap;

/** Light mode CSS custom properties (`:root[data-theme='light']`). */
export const lightCssVariables = {
  '--theme-primary-color': themeColors.light.primary,
  '--theme-secondary-color': themeColors.light.secondary,
  '--theme-accent-color': lightCss['--theme-accent-color'],
  '--theme-primary-hover-color': lightCss['--theme-primary-hover-color'],
  '--theme-button-fg-color': resolveButtonForeground('light', themeColors.light.primary, themeColors.light.secondary),
  '--theme-paper-color': lightCss['--theme-paper-color'],
  '--theme-ink-color': lightCss['--theme-ink-color'],
  '--theme-text-color': themeColors.light.text,
  '--theme-text-secondary-color': lightCss['--theme-text-secondary-color'],
  '--theme-main-background-color': themeColors.light.background,
  '--theme-main-background-secondary-color': themeColors.light.backgroundSecondary,
  '--theme-surface-color': lightCss['--theme-surface-color'],
  '--theme-surface-variant-color': lightCss['--theme-surface-variant-color'],
  '--theme-border-color': lightCss['--theme-border-color'],
  '--theme-border-strong-color': lightCss['--theme-border-strong-color'],
  '--theme-focus-ring-color': lightCss['--theme-focus-ring-color'],
  '--theme-link-color': lightCss['--theme-link-color'],
  '--theme-primary-fill-color': lightCss['--theme-primary-fill-color'],
  '--theme-on-primary-color': lightCss['--theme-on-primary-color'],
  '--theme-success-hue-color': lightCss['--theme-success-hue-color'],
  '--theme-warning-hue-color': lightCss['--theme-warning-hue-color'],
  '--theme-error-hue-color': lightCss['--theme-error-hue-color'],
  '--theme-info-hue-color': semanticColors.info,
  '--theme-success-ink-color': lightCss['--theme-success-ink-color'],
  '--theme-warning-ink-color': lightCss['--theme-warning-ink-color'],
  '--theme-error-ink-color': lightCss['--theme-error-ink-color'],
  '--theme-info-ink-color': lightCss['--theme-info-ink-color'],
  '--theme-form-background-color': lightCss['--theme-form-background-color'],
  '--theme-form-background-disabled-color': lightCss['--theme-form-background-disabled-color'],
  '--theme-form-placeholder-color': lightCss['--theme-form-placeholder-color'],
  '--theme-form-invalid-color': lightCss['--theme-form-invalid-color'],
  '--primary-default': themeColors.light.primary,
  '--border-radius-md': BORDER_RADIUS_MD,
} as const satisfies ThemeCssVariableMap;

/** @deprecated Prefer `darkCssVariables` — alias kept for existing call sites. */
export const defaultCssVariables = darkCssVariables;

/** Returns the CSS variable map for a resolved color mode (build-time hex values). */
export function getCssVariablesForMode(mode: 'light' | 'dark'): ThemeCssVariableMap {
  return mode === 'light' ? { ...lightCssVariables } : { ...darkCssVariables };
}

/**
 * Roles the stylesheet derives at runtime from the five inputs (paper / ink → neutral scale,
 * status hue → status inks), plus the active paper / ink and button-text pointers. They must never
 * be written inline on `:root`: an inline hex would pin the build-time default and a live paper /
 * ink change would stop reaching them. The stylesheet already switches them per mode
 * (`:root` / `[data-theme='light']`). {@link withoutModeColors} drops them (with every mode colour,
 * {@link MODE_COLOR_TOKENS}) from what the colour-mode writer and the built-in light / dark packs
 * pin. The palette packs and `Theme.create` / `Theme.apply({ colors })` still write some of them
 * inline — see the TODO (`docs/web/features/interaction-redesign.md#todo`).
 */
export const DERIVED_ROLE_TOKENS: ReadonlySet<string> = new Set([
  '--theme-paper-color',
  '--theme-ink-color',
  '--theme-main-background-color',
  '--theme-main-background-secondary-color',
  '--theme-surface-color',
  '--theme-surface-variant-color',
  '--theme-text-color',
  '--theme-text-secondary-color',
  '--theme-border-color',
  '--theme-border-strong-color',
  '--theme-success-ink-color',
  '--theme-warning-ink-color',
  '--theme-error-ink-color',
  '--theme-info-ink-color',
  '--theme-button-fg-color',
]);

/**
 * Every colour the stylesheet switches per mode: each `--theme-…-color` name in the rename map
 * (R-T3d). The stylesheet already declares both modes' values (and the runtime writes the per-mode
 * variations), so an inline write of one of these would pin a single mode's value over the other.
 */
export const MODE_COLOR_TOKENS: ReadonlySet<string> = new Set(Object.values(COLOR_RENAME_MAP.renames));

/**
 * A per-mode variation name: `--theme-<what>-{light,dark}{,-background}-color` (the paper / ink
 * pairs, the solid-colour variations, `--theme-button-fg-dark-color`, `--theme-primary-fill-*`).
 * core/web writes these inline once for both modes; the stylesheet switches the active names, so
 * the full-replace writers (`setTokens`: colour mode, `Theme.set` / `select` / `applyModeVariables`,
 * `resetTokens`) keep them. Remove them with `removeTokens`.
 */
const MODE_VARIATION_NAME = /^--theme-[a-z0-9-]+-(?:light|dark)(?:-background)?-color$/;

export function isModeVariationName(name: string): boolean {
  return MODE_VARIATION_NAME.test(name);
}

/** A token map without mode colours or runtime-derived roles (what the mode writers may pin). */
export function withoutModeColors<T extends Record<string, string>>(tokens: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(tokens).filter(([key]) => !DERIVED_ROLE_TOKENS.has(key) && !MODE_COLOR_TOKENS.has(key))
  ) as Partial<T>;
}

/**
 * Tokens a colour-mode switch writes inline: the mode map minus every mode colour and derived
 * role — `--border-radius-md` and the palette name `--primary-default`. The stylesheet declares
 * `--primary-default` on `:root` only (the dark value), so this pin is what switches it per mode.
 * It no longer feeds `--text-shadow-root` (that mixes `--theme-primary-color`); the pin only serves
 * the Theme API and the PrimeVue hover fallback (`primevue.ts`) — see the TODO. The
 * `--tertiary-color` pin was dropped in Task 8 (R-T8h): the stylesheet already switches it per
 * mode (`var(--oxblood-color)`) to the same values.
 */
export function getInlineTokensForMode(mode: 'light' | 'dark'): Record<string, string> {
  return withoutModeColors(getCssVariablesForMode(mode) as Record<string, string>) as Record<string, string>;
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
