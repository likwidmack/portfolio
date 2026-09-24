/**
 * Module-level Theme singleton for `@tgmc/theme`.
 * Ready-made theme lookup/select, create named packs, and runtime CSS variable updates
 * (colors, text, ratios, breakpoints, and arbitrary token maps).
 */

import {
  disposeThemeMode,
  getResolvedThemeMode,
  getSystemPrefersDark,
  getThemeMode,
  initThemeMode,
  resolveThemeMode,
  setThemeMode,
  subscribeThemeMode,
  type InitThemeModeOptions,
  type ThemeModeChange,
  type ThemeModeListener,
  type ThemeModePreference,
  type ThemeResolvedMode,
} from './color-mode.js';
import { resolveButtonForeground } from './contrast.js';
import {
  getToken,
  getTokens,
  resetTokens,
  setTokens,
  subscribeTokens,
  updateTokens,
  type ThemeBridgeOptions,
  type ThemeTokenMap,
} from './token-registry.js';
import { darkCssVariables, getCssVariablesForMode, lightCssVariables, palettes } from './tokens.js';

export type ThemeRatios = {
  surface?: string;
  card?: string;
  media?: string;
};

export type ThemeBreakpoints = {
  /** Writes `--breakpoint` (default Sass widescreen is `1440px`). */
  current?: string;
  mobile?: string;
  tablet?: string;
  standard?: string;
  widescreen?: string;
  ultrawide?: string;
};

export type ThemeTextSettings = {
  color?: string;
  secondary?: string;
};

export type ThemeDefinition = {
  /** Full or partial CSS custom-property map. */
  tokens?: ThemeTokenMap;
  /** Convenience color roles → CSS vars. */
  colors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
    background?: string;
    backgroundSecondary?: string;
    surface?: string;
    surfaceVariant?: string;
  };
  text?: ThemeTextSettings;
  ratios?: ThemeRatios;
  breakpoints?: ThemeBreakpoints;
};

const BUILTIN_LIGHT = 'light';
const BUILTIN_DARK = 'dark';

export type ThemeWriteOptions = ThemeBridgeOptions & { source?: string };

const packs = new Map<string, ThemeTokenMap>();
let selectedName: string | null = null;

function withSource(options: ThemeWriteOptions, defaultSource: string): ThemeWriteOptions {
  return { ...options, source: options.source ?? defaultSource };
}

function normalizeTokenName(property: string): string {
  return property.startsWith('--') ? property : `--${property}`;
}

function normalizeTokenMap(variables: ThemeTokenMap): ThemeTokenMap {
  const normalized: ThemeTokenMap = {};
  for (const [key, value] of Object.entries(variables)) {
    if (value == null) continue;
    normalized[normalizeTokenName(key)] = String(value);
  }
  return normalized;
}

function paletteToTokens(swatches: Record<string, string>): ThemeTokenMap {
  const values = Object.values(swatches);
  const primary = values[0] ?? '#000000';
  const secondary = values[1] ?? primary;
  const accent = values[2] ?? primary;
  return {
    '--primary-color': primary,
    '--primary-default': primary,
    '--secondary-color': secondary,
    '--accent-color': accent,
    '--focus-ring': primary,
    '--button-fg': resolveButtonForeground('dark', primary, secondary),
  };
}

function definitionToTokens(definition: ThemeDefinition): ThemeTokenMap {
  const patch: ThemeTokenMap = {};

  if (definition.tokens) {
    Object.assign(patch, normalizeTokenMap(definition.tokens));
  }

  const { colors } = definition;
  if (colors) {
    if (colors.primary) {
      patch['--primary-color'] = colors.primary;
      patch['--primary-default'] = colors.primary;
      patch['--focus-ring'] = colors.primary;
      const secondary = colors.secondary ?? getToken('--secondary-color') ?? colors.primary;
      patch['--button-fg'] = resolveButtonForeground('dark', colors.primary, secondary);
    }
    if (colors.secondary) patch['--secondary-color'] = colors.secondary;
    if (colors.accent) patch['--accent-color'] = colors.accent;
    else if (colors.primary) patch['--accent-color'] = colors.primary;
    if (colors.background) patch['--main-background'] = colors.background;
    if (colors.backgroundSecondary) patch['--main-background-secondary'] = colors.backgroundSecondary;
    if (colors.surface) patch['--surface-color'] = colors.surface;
    if (colors.surfaceVariant) patch['--surface-variant'] = colors.surfaceVariant;
  }

  Object.assign(patch, textToTokens(definition.text));
  Object.assign(patch, ratiosToTokens(definition.ratios));
  Object.assign(patch, breakpointsToTokens(definition.breakpoints));

  return patch;
}

function textToTokens(text?: ThemeTextSettings): ThemeTokenMap {
  if (!text) return {};
  const patch: ThemeTokenMap = {};
  if (text.color) patch['--text-color'] = text.color;
  if (text.secondary) patch['--text-secondary-color'] = text.secondary;
  return patch;
}

function ratiosToTokens(ratios?: ThemeRatios): ThemeTokenMap {
  if (!ratios) return {};
  const patch: ThemeTokenMap = {};
  if (ratios.surface) patch['--surface-ratio'] = ratios.surface;
  if (ratios.card) patch['--card-ratio'] = ratios.card;
  if (ratios.media) patch['--media-ratio'] = ratios.media;
  return patch;
}

function breakpointsToTokens(breakpoints?: ThemeBreakpoints): ThemeTokenMap {
  if (!breakpoints) return {};
  const patch: ThemeTokenMap = {};
  if (breakpoints.current) patch['--breakpoint'] = breakpoints.current;
  if (breakpoints.mobile) patch['--breakpoint-mobile'] = breakpoints.mobile;
  if (breakpoints.tablet) patch['--breakpoint-tablet'] = breakpoints.tablet;
  if (breakpoints.standard) patch['--breakpoint-standard'] = breakpoints.standard;
  if (breakpoints.widescreen) patch['--breakpoint-widescreen'] = breakpoints.widescreen;
  if (breakpoints.ultrawide) patch['--breakpoint-ultrawide'] = breakpoints.ultrawide;
  return patch;
}

function seedBuiltins(): void {
  packs.set(BUILTIN_LIGHT, { ...lightCssVariables });
  packs.set(BUILTIN_DARK, { ...darkCssVariables });
  for (const [name, swatches] of Object.entries(palettes)) {
    packs.set(name, paletteToTokens(swatches as Record<string, string>));
  }
}

seedBuiltins();

/**
 * Theme singleton — shared registry of ready-made packs + CSS variable writers.
 * DOM writes go through the token registry (honors `dryRun` / bridges).
 */
export const Theme = {
  /** Registered ready-made theme names (builtins + custom). */
  list(): string[] {
    return [...packs.keys()];
  },

  /** Snapshot a registered pack without applying it. */
  get(name: string): Readonly<ThemeTokenMap> | undefined {
    const pack = packs.get(name);
    return pack ? { ...pack } : undefined;
  },

  /** Currently selected pack name, if any. */
  selected(): string | null {
    return selectedName;
  },

  /**
   * Register or replace a named theme pack.
   * Does not apply until {@link Theme.select}.
   */
  create(name: string, definition: ThemeDefinition): Readonly<ThemeTokenMap> {
    const tokens = definitionToTokens(definition);
    packs.set(name, tokens);
    return { ...tokens };
  },

  /**
   * Apply a registered pack.
   * `light` / `dark` replace the full token map; named palette packs merge as accent overlays.
   * @throws {Error} when the name is unknown
   */
  select(name: string, options: ThemeWriteOptions = {}): Readonly<ThemeTokenMap> {
    const pack = packs.get(name);
    if (!pack) {
      throw new Error(`Unknown theme: ${name}`);
    }
    selectedName = name;
    const write = withSource(options, `theme:${name}`);
    if (name === BUILTIN_LIGHT || name === BUILTIN_DARK) {
      return setTokens(pack, write);
    }
    return updateTokens(pack, write);
  },

  /** Merge token updates (low-level path; same as `updateTokens`). */
  update(patch: ThemeTokenMap, options: ThemeWriteOptions = {}): Readonly<ThemeTokenMap> {
    return updateTokens(patch, withSource(options, 'theme'));
  },

  /** Replace the full token map (low-level path; same as `setTokens`). */
  set(tokens: ThemeTokenMap, options: ThemeWriteOptions = {}): Readonly<ThemeTokenMap> {
    return setTokens(tokens, withSource(options, 'theme'));
  },

  setText(text: ThemeTextSettings, options: ThemeWriteOptions = {}): Readonly<ThemeTokenMap> {
    return Theme.update(textToTokens(text), withSource(options, 'theme:text'));
  },

  setRatios(ratios: ThemeRatios, options: ThemeWriteOptions = {}): Readonly<ThemeTokenMap> {
    return Theme.update(ratiosToTokens(ratios), withSource(options, 'theme:ratios'));
  },

  setBreakpoints(breakpoints: ThemeBreakpoints, options: ThemeWriteOptions = {}): Readonly<ThemeTokenMap> {
    return Theme.update(breakpointsToTokens(breakpoints), withSource(options, 'theme:breakpoints'));
  },

  /** Apply light/dark CSS maps for a resolved mode without changing mode preference storage. */
  applyModeVariables(mode: ThemeResolvedMode, options: ThemeWriteOptions = {}): Readonly<ThemeTokenMap> {
    selectedName = mode;
    return setTokens({ ...getCssVariablesForMode(mode) }, withSource(options, `theme:mode:${mode}`));
  },

  reset(options: ThemeBridgeOptions = {}): Readonly<ThemeTokenMap> {
    selectedName = null;
    return resetTokens(options);
  },

  getToken,
  getTokens,
  subscribeTokens,

  initMode: initThemeMode,
  setMode: setThemeMode,
  getMode: getThemeMode,
  getResolvedMode: getResolvedThemeMode,
  getSystemPrefersDark,
  resolveMode: resolveThemeMode,
  subscribeMode: subscribeThemeMode,
  disposeMode: disposeThemeMode,
} as const;

export type {
  InitThemeModeOptions,
  ThemeBridgeOptions,
  ThemeModeChange,
  ThemeModeListener,
  ThemeModePreference,
  ThemeResolvedMode,
  ThemeTokenMap,
};

export default Theme;
