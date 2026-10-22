/**
 * Public Theme surface for third-party packs and host apps.
 *
 * Paint via `Theme.apply`. Read/subscribe and pack helpers stay on this entry;
 * registry writers (`updateTokens`, …) are not exported — use `Theme.apply` / `Theme.set` / `Theme.reset`.
 *
 * Colour keys are the `--theme-…-color` names. An old key (`--primary-color`, `--paper` …) is
 * still accepted on input and written under its new name with the same value (colour system
 * Task 8, R-T8c); `getToken('--primary-color')` reads `--theme-primary-color`.
 *
 * @example
 * ```ts
 * import {
 *   Theme,
 *   defineTokenPack,
 *   registerTokenSource,
 *   applyTokenSource,
 *   subscribeTokens,
 *   getTokens,
 * } from '@tgmc/theme/tokens';
 *
 * registerTokenSource(
 *   defineTokenPack('partner', () => ({
 *     '--theme-primary-color': '#1264a3',
 *     '--theme-secondary-color': '#de4e2b',
 *   }))
 * );
 * await applyTokenSource('partner', { primevue: true, foundation: true });
 *
 * Theme.apply({ '--theme-accent-color': '#de4e2b' });
 *
 * const stop = subscribeTokens(({ patch }) => {
 *   console.log('tokens changed', patch);
 * });
 * ```
 */

export {
  applyAllTokenSources,
  applyTokenSource,
  defineTokenPack,
  getToken,
  getTokens,
  registerTokenSource,
  subscribeTokens,
} from './token-registry.js';
export type {
  ThemeBridgeOptions,
  ThemeTokenChange,
  ThemeTokenListener,
  ThemeTokenMap,
  ThemeTokenSource,
} from './token-registry.js';

export {
  disposeThemeMode,
  getResolvedThemeMode,
  getSystemPrefersDark,
  getThemeMode,
  initThemeMode,
  resolveThemeMode,
  setThemeMode,
  subscribeThemeMode,
} from './color-mode.js';
export type {
  InitThemeModeOptions,
  ThemeModeChange,
  ThemeModeListener,
  ThemeModePreference,
  ThemeResolvedMode,
} from './color-mode.js';

export { darkCssVariables, defaultCssVariables, getCssVariablesForMode, lightCssVariables } from './tokens.js';
export type { ThemeCssVariableMap } from './tokens.js';

export { Theme } from './theme.js';
export type {
  ThemeApplyInput,
  ThemeApplyOptions,
  ThemeBreakpoints,
  ThemeDefinition,
  ThemeRatios,
  ThemeTextSettings,
  ThemeWriteOptions,
} from './theme.js';

export { Color } from './color.js';
export type { BaseColorKey, ColorLookup, PaletteName, SemanticColorKey, ThemeModeName, ThemeRoleKey } from './color.js';
