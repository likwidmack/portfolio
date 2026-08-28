import type { ThemeTokensApi } from '#shared/theme/theme-tokens-api';
import {
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
  type ThemeBridgeOptions,
  type ThemeModePreference,
} from '@tgmc/theme/tokens';

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
     * Consumers can inject this with `const tokens = useNuxtApp().$themeTokens` or
     * via the composition API with `const tokens = inject('themeTokens')`.
     *
     * The API surface intentionally mirrors the token package so callers can
     * read current tokens, subscribe for updates, register additional token
     * sources (for design-system bridges), and apply or reset token sets.
     */
    const api: ThemeTokensApi = {
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

    // Notify other plugins / app code when the theme mode changes. Consumers
    // can listen to the `theme:mode:change` hook to react to system/light/dark
    // transitions (for example to update visualizations or re-render CSS-only
    // components).
    subscribeThemeMode((change) => {
      void nuxtApp.callHook('theme:mode:change', change);
    });

    if (import.meta.client && runtimeTheme?.applyDefaultsOnInit !== false) {
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
