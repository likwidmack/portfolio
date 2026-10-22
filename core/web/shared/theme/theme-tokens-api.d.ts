import type {
  applyAllTokenSources,
  applyTokenSource,
  defineTokenPack,
  getResolvedThemeMode,
  getThemeMode,
  getToken,
  getTokens,
  registerTokenSource,
  setThemeMode,
  subscribeThemeMode,
  subscribeTokens,
  Theme,
  ThemeBridgeOptions,
  ThemeModeChange,
  ThemeModePreference,
  ThemeResolvedMode,
  ThemeTokenMap,
  ThemeTokenSource,
} from '@tgmc/theme/tokens';

/** Public API injected by `plugins/theme-tokens.client.ts`. */
export type ThemeTokensApi = {
  /** Ready-made packs + grouped variable updates (preferred: `theme.apply` / `theme.remove`). */
  theme: typeof Theme;
  getToken: typeof getToken;
  getTokens: typeof getTokens;
  /** Full registry reset (bridge-bound). Prefer `theme.reset` for new call sites. */
  resetTokens: typeof Theme.reset;
  subscribeTokens: typeof subscribeTokens;
  registerTokenSource: typeof registerTokenSource;
  defineTokenPack: typeof defineTokenPack;
  applyTokenSource: typeof applyTokenSource;
  applyAllTokenSources: typeof applyAllTokenSources;
  getThemeMode: typeof getThemeMode;
  getResolvedThemeMode: typeof getResolvedThemeMode;
  setThemeMode: typeof setThemeMode;
  subscribeThemeMode: typeof subscribeThemeMode;
  bridges: ThemeBridgeOptions;
};

export type {
  ThemeBridgeOptions,
  ThemeModeChange,
  ThemeModePreference,
  ThemeResolvedMode,
  ThemeTokenMap,
  ThemeTokenSource,
};
