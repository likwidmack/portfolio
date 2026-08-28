import type {
  applyAllTokenSources,
  applyTokenSource,
  defineTokenPack,
  getResolvedThemeMode,
  getThemeMode,
  getToken,
  getTokens,
  registerTokenSource,
  resetTokens,
  setThemeMode,
  setTokens,
  subscribeThemeMode,
  subscribeTokens,
  ThemeBridgeOptions,
  ThemeModeChange,
  ThemeModePreference,
  ThemeResolvedMode,
  ThemeTokenMap,
  ThemeTokenSource,
  updateToken,
  updateTokens,
} from '@tgmc/theme/tokens';

/** Public API injected by `plugins/theme-tokens.client.ts`. */
export type ThemeTokensApi = {
  getToken: typeof getToken;
  getTokens: typeof getTokens;
  updateToken: typeof updateToken;
  updateTokens: typeof updateTokens;
  setTokens: typeof setTokens;
  resetTokens: typeof resetTokens;
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
