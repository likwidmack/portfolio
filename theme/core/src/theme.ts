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
import { normalizeColorNames } from './color-rename.js';
import { resolveButtonForeground } from './contrast.js';
import type { StudioPreset } from './studio-presets.js';
import presetCatalog from './theme-presets.json' with { type: 'json' };
import {
  getToken,
  getTokens,
  removeTokens,
  resetTokens,
  setTokens,
  subscribeTokens,
  updateTokens,
  type ThemeBridgeOptions,
  type ThemeTokenMap,
} from './token-registry.js';
import { getInlineTokensForMode, palettes } from './tokens.js';

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
  /**
   * The five colour inputs. Everything else derives from them in CSS: the neutral scale
   * (`--theme-neutral-0…1000-color`, paper → ink), surfaces, text, borders and status tones.
   * Written under the active `--theme-…-color` names (inline, so they hold in both modes).
   */
  colors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
    /** Background ("paper") for the active mode; the neutral scale runs paper → ink. */
    paper?: string;
    /** Foreground ("ink" / pen) for the active mode. */
    ink?: string;
    /** @deprecated Derived from paper / ink — set those instead. Still honoured as an override. */
    background?: string;
    /** @deprecated Derived from paper / ink. */
    backgroundSecondary?: string;
    /** @deprecated Derived from paper / ink. */
    surface?: string;
    /** @deprecated Derived from paper / ink. */
    surfaceVariant?: string;
  };
  text?: ThemeTextSettings;
  ratios?: ThemeRatios;
  breakpoints?: ThemeBreakpoints;
};

const BUILTIN_LIGHT = 'light';
const BUILTIN_DARK = 'dark';

export type ThemeWriteOptions = ThemeBridgeOptions & { source?: string };

export type ThemeApplyInput = ThemeTokenMap | ThemeDefinition;

export type ThemeApplyOptions = ThemeBridgeOptions & { source?: string; dryRun?: boolean };

const DEFAULT_APPLY_BRIDGES: ThemeBridgeOptions = { primevue: true, foundation: true };

function resolveApplyOptions(options: ThemeApplyOptions = {}): ThemeWriteOptions {
  return {
    ...DEFAULT_APPLY_BRIDGES,
    ...options,
    source: options.source ?? 'theme:apply',
  };
}

function isThemeDefinition(input: ThemeApplyInput): input is ThemeDefinition {
  return (
    input != null &&
    typeof input === 'object' &&
    ('colors' in input || 'text' in input || 'ratios' in input || 'breakpoints' in input || 'tokens' in input) &&
    !Object.keys(input).some((key) => key.startsWith('--'))
  );
}

const packs = new Map<string, ThemeTokenMap>();
let selectedName: string | null = null;

function withSource(options: ThemeWriteOptions, defaultSource: string): ThemeWriteOptions {
  return { ...options, source: options.source ?? defaultSource };
}

function normalizeTokenName(property: string): string {
  return property.startsWith('--') ? property : `--${property}`;
}

/** Keys get their `--` prefix; old colour keys move to their new names (R-T8c). */
function normalizeTokenMap(variables: ThemeTokenMap): ThemeTokenMap {
  const normalized: ThemeTokenMap = {};
  for (const [key, value] of Object.entries(variables)) {
    if (value == null) continue;
    normalized[normalizeTokenName(key)] = String(value);
  }
  return normalizeColorNames(normalized);
}

function paletteToTokens(swatches: Record<string, string>): ThemeTokenMap {
  const values = Object.values(swatches);
  const primary = values[0] ?? '#000000';
  const secondary = values[1] ?? primary;
  const accent = values[2] ?? primary;
  return {
    '--theme-primary-color': primary,
    '--primary-default': primary,
    '--theme-secondary-color': secondary,
    '--theme-accent-color': accent,
    // `--theme-focus-ring-color` stays the theme's contrast role (≥ 3:1) — a brand primary may not pass.
    '--theme-button-fg-color': resolveButtonForeground('dark', primary, secondary),
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
      patch['--theme-primary-color'] = colors.primary;
      patch['--primary-default'] = colors.primary;
      const secondary = colors.secondary ?? getToken('--theme-secondary-color') ?? colors.primary;
      patch['--theme-button-fg-color'] = resolveButtonForeground('dark', colors.primary, secondary);
    }
    if (colors.secondary) patch['--theme-secondary-color'] = colors.secondary;
    if (colors.accent) patch['--theme-accent-color'] = colors.accent;
    else if (colors.primary) patch['--theme-accent-color'] = colors.primary;
    if (colors.paper) patch['--theme-paper-color'] = colors.paper;
    if (colors.ink) patch['--theme-ink-color'] = colors.ink;
    if (colors.background) patch['--theme-main-background-color'] = colors.background;
    if (colors.backgroundSecondary) patch['--theme-main-background-secondary-color'] = colors.backgroundSecondary;
    if (colors.surface) patch['--theme-surface-color'] = colors.surface;
    if (colors.surfaceVariant) patch['--theme-surface-variant-color'] = colors.surfaceVariant;
  }

  Object.assign(patch, textToTokens(definition.text));
  Object.assign(patch, ratiosToTokens(definition.ratios));
  Object.assign(patch, breakpointsToTokens(definition.breakpoints));

  // Old colour keys in `definition.tokens` go out under their `--theme-…-color` names only (R-T8c).
  return normalizeColorNames(patch);
}

function textToTokens(text?: ThemeTextSettings): ThemeTokenMap {
  if (!text) return {};
  const patch: ThemeTokenMap = {};
  if (text.color) patch['--theme-text-color'] = text.color;
  if (text.secondary) patch['--theme-text-secondary-color'] = text.secondary;
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
  // The built-in light / dark packs never pin a mode colour or derived role inline: the stylesheet
  // switches every colour per mode (R-T3d), so they carry only what the colour-mode writer writes.
  // The palette packs seeded below do pin mode colours and derived roles (`paletteToTokens`), which
  // a mode switch drops — see the TODO (docs/web/features/interaction-redesign.md#todo).
  packs.set(BUILTIN_LIGHT, getInlineTokensForMode('light') as ThemeTokenMap);
  packs.set(BUILTIN_DARK, getInlineTokensForMode('dark') as ThemeTokenMap);
  for (const [name, swatches] of Object.entries(palettes)) {
    packs.set(name, paletteToTokens(swatches as Record<string, string>));
  }
}

seedBuiltins();

/**
 * Theme singleton — shared registry of ready-made packs + CSS variable writers.
 * DOM writes go through the token registry (honors `dryRun` / bridges).
 */
const studioPresets = presetCatalog.presets as StudioPreset[];

export const Theme = {
  /**
   * Theme Studio catalog: palette collections and single light/dark colors.
   * Collections with more than three swatches include a clipped gradient field.
   */
  presets(): readonly StudioPreset[] {
    return studioPresets;
  },

  /** One studio preset, or `undefined` when the id is not in the catalog. */
  preset(id: string): StudioPreset | undefined {
    return studioPresets.find((item) => item.id === id);
  },

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

  /**
   * Preferences-facing paint seam: merge a token map or {@link ThemeDefinition}.
   * Bridges default on; callers may override (e.g. Theme tests with `dryRun`).
   */
  apply(input: ThemeApplyInput, options: ThemeApplyOptions = {}): Readonly<ThemeTokenMap> {
    const write = resolveApplyOptions(options);
    const patch = isThemeDefinition(input) ? definitionToTokens(input) : normalizeTokenMap(input);
    return updateTokens(patch, write);
  },

  /**
   * Remove names from the registry and `:root` (keeps `getToken()` and the DOM in sync).
   * Preferences paint uses this when clearing defaults / absent background layer keys.
   */
  remove(names: readonly string[], options: ThemeApplyOptions = {}): Readonly<ThemeTokenMap> {
    return removeTokens(names, resolveApplyOptions(options));
  },

  /** Replace the full token map (low-level path; same as registry `setTokens`). */
  set(tokens: ThemeTokenMap, options: ThemeWriteOptions = {}): Readonly<ThemeTokenMap> {
    return setTokens(tokens, withSource(options, 'theme'));
  },

  setText(text: ThemeTextSettings, options: ThemeWriteOptions = {}): Readonly<ThemeTokenMap> {
    return Theme.apply(textToTokens(text), withSource(options, 'theme:text'));
  },

  setRatios(ratios: ThemeRatios, options: ThemeWriteOptions = {}): Readonly<ThemeTokenMap> {
    return Theme.apply(ratiosToTokens(ratios), withSource(options, 'theme:ratios'));
  },

  setBreakpoints(breakpoints: ThemeBreakpoints, options: ThemeWriteOptions = {}): Readonly<ThemeTokenMap> {
    return Theme.apply(breakpointsToTokens(breakpoints), withSource(options, 'theme:breakpoints'));
  },

  /** Apply light/dark CSS maps for a resolved mode without changing mode preference storage. */
  applyModeVariables(mode: ThemeResolvedMode, options: ThemeWriteOptions = {}): Readonly<ThemeTokenMap> {
    selectedName = mode;
    return setTokens({ ...getInlineTokensForMode(mode) }, withSource(options, `theme:mode:${mode}`));
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
