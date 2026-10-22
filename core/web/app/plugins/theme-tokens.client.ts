import { Preferences } from '#shared/preferences';
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
  setThemeMode,
  subscribeThemeMode,
  subscribeTokens,
  type ThemeApplyInput,
  type ThemeApplyOptions,
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
    apply: (input: ThemeApplyInput, options?: ThemeApplyOptions) => Theme.apply(input, withBridges(options)),
    remove: (names: readonly string[], options?: ThemeApplyOptions) => Theme.remove(names, withBridges(options)),
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
     * Prefer `api.theme.apply` / `api.theme.remove` (and `api.theme` packs / mode). Personalize /
     * Style Studio paint through Preferences → Theme.apply — do not call low-level writers from
     * product UI. `api.theme` is bridge-bound so PrimeVue/foundation writes apply by default.
     */
    const theme = bindThemeBridges(bridges);
    const api: ThemeTokensApi = {
      theme,
      getToken,
      getTokens,
      resetTokens: (options) => theme.reset(options),
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
      let stored: ThemeModePreference = 'system';
      try {
        stored = Preferences.load(localStorage).mode;
      } catch {
        // Blocked storage (SecurityError on access) must not stop startup: use the runtime default.
      }
      const change = initThemeMode({
        ...bridges,
        preference: stored !== 'system' ? stored : (runtimeTheme?.mode ?? 'system'),
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
