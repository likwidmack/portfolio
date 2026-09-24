import type { ThemeTokensApi } from '#shared/theme/theme-tokens-api';
import {
  Theme,
  applyAllTokenSources,
  applyTokenSource,
  defineTokenPack,
  getResolvedThemeMode,
  getThemeMode,
  getToken,
  getTokens,
  initThemeMode,
  registerTokenSource,
  resetTokens,
  setThemeMode,
  setTokens,
  subscribeThemeMode,
  subscribeTokens,
  updateToken,
  updateTokens,
  type ThemeBreakpoints,
  type ThemeBridgeOptions,
  type ThemeDefinition,
  type ThemeModePreference,
  type ThemeRatios,
  type ThemeResolvedMode,
  type ThemeTextSettings,
  type ThemeTokenMap,
  type ThemeWriteOptions,
} from '@tgmc/theme/tokens';

type ThemeApi = typeof Theme;

/**
 * Bind Nuxt runtime bridges onto Theme writes so callers of `$themeTokens.theme`
 * do not need to pass `{ primevue, foundation }` on every call.
 */
function bindThemeBridges(bridges: ThemeBridgeOptions): ThemeApi {
  const withBridges = (options: ThemeWriteOptions = {}): ThemeWriteOptions => ({
    ...bridges,
    ...options,
  });

  return {
    ...Theme,
    select: (name: string, options?: ThemeWriteOptions) => Theme.select(name, withBridges(options)),
    create: (name: string, definition: ThemeDefinition) => Theme.create(name, definition),
    update: (patch: ThemeTokenMap, options?: ThemeWriteOptions) => Theme.update(patch, withBridges(options)),
    set: (tokens: ThemeTokenMap, options?: ThemeWriteOptions) => Theme.set(tokens, withBridges(options)),
    setText: (text: ThemeTextSettings, options?: ThemeWriteOptions) => Theme.setText(text, withBridges(options)),
    setRatios: (ratios: ThemeRatios, options?: ThemeWriteOptions) => Theme.setRatios(ratios, withBridges(options)),
    setBreakpoints: (breakpoints: ThemeBreakpoints, options?: ThemeWriteOptions) =>
      Theme.setBreakpoints(breakpoints, withBridges(options)),
    applyModeVariables: (mode: ThemeResolvedMode, options?: ThemeWriteOptions) =>
      Theme.applyModeVariables(mode, withBridges(options)),
    reset: (options?: ThemeBridgeOptions) => Theme.reset(withBridges(options)),
    initMode: (options) => Theme.initMode({ ...bridges, ...options }),
    setMode: (preference: ThemeModePreference, options?: ThemeWriteOptions & { persist?: boolean }) =>
      Theme.setMode(preference, withBridges(options)),
  };
}

/**
 * Client plugin: initializes unified light/dark/system color mode, exposes the token
 * registry, and fires theme hooks so third-party plugins can register packs / react to mode.
 */
export default defineNuxtPlugin({
  name: 'tgmc-theme-tokens',
  enforce: 'pre',
  async setup(nuxtApp) {
    const runtimeTheme = useRuntimeConfig().public.theme as
      | {
          mode?: ThemeModePreference;
          bridges?: ThemeBridgeOptions;
          applySourcesOnMount?: boolean;
          applyDefaultsOnInit?: boolean;
        }
      | undefined;

    const bridges: ThemeBridgeOptions = {
      primevue: true,
      foundation: true,
      ...runtimeTheme?.bridges,
    };

    /**
     * Public ThemeTokens API exposed to the app via `nuxtApp.provide('themeTokens', api)`.
     *
     * Prefer `api.theme` for ready-made packs and grouped updates; low-level
     * `updateTokens` remains for partial CSS var patches (e.g. personalization accents).
     * `api.theme` is bridge-bound so PrimeVue/foundation writes apply by default.
     */
    const api: ThemeTokensApi = {
      theme: bindThemeBridges(bridges),
      getToken,
      getTokens,
      updateToken,
      updateTokens,
      setTokens,
      resetTokens,
      subscribeTokens,
      registerTokenSource,
      defineTokenPack,
      applyTokenSource,
      applyAllTokenSources,
      getThemeMode,
      getResolvedThemeMode,
      setThemeMode,
      subscribeThemeMode,
      bridges,
    };

    nuxtApp.provide('themeTokens', api);

    subscribeThemeMode((change) => {
      void nuxtApp.callHook('theme:mode:change', change);
    });

    if (runtimeTheme?.applyDefaultsOnInit !== false) {
      const change = initThemeMode({
        ...bridges,
        preference: runtimeTheme?.mode ?? 'system',
        listenToSystem: true,
      });
      await nuxtApp.callHook('theme:mode:change', change);
    }

    await nuxtApp.callHook('theme:tokens:ready', api);

    if (runtimeTheme?.applySourcesOnMount !== false) {
      nuxtApp.hook('app:mounted', async () => {
        await applyAllTokenSources(bridges);
        await nuxtApp.callHook('theme:tokens:applied', api.getTokens());
      });
    }
  },
});
