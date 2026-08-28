/**
 * Public token surface for third-party packs and host apps.
 *
 * @example
 * ```ts
 * import {
 *   defineTokenPack,
 *   registerTokenSource,
 *   applyTokenSource,
 *   subscribeTokens,
 *   updateTokens,
 *   getTokens,
 * } from '@tgmc/theme/tokens';
 *
 * registerTokenSource(
 *   defineTokenPack('partner', () => ({
 *     '--primary-color': '#1264a3',
 *     '--secondary-color': '#de4e2b',
 *   }))
 * );
 * await applyTokenSource('partner', { primevue: true, foundation: true });
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
  resetTokens,
  setTokens,
  subscribeTokens,
  updateToken,
  updateTokens,
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
