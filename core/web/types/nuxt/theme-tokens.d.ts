import type { HookResult } from '@nuxt/schema';
import type {
  ThemeBridgeOptions,
  ThemeModeChange,
  ThemeTokenMap,
  ThemeTokensApi,
} from '../../shared/theme/theme-tokens-api';

declare module 'nuxt/app' {
  interface NuxtApp {
    $themeTokens: ThemeTokensApi;
  }

  interface RuntimeNuxtHooks {
    /** Fired once the theme token API is ready — register third-party packs here. */
    'theme:tokens:ready': (api: ThemeTokensApi) => HookResult;
    /** Fired after registered sources were applied on app:mounted. */
    'theme:tokens:applied': (tokens: Readonly<ThemeTokenMap>) => HookResult;
    /** Fired when color mode preference or resolved mode changes. */
    'theme:mode:change': (change: ThemeModeChange) => HookResult;
  }
}

declare module '#app' {
  interface NuxtApp {
    $themeTokens: ThemeTokensApi;
  }

  interface RuntimeNuxtHooks {
    'theme:tokens:ready': (api: ThemeTokensApi) => HookResult;
    'theme:tokens:applied': (tokens: Readonly<ThemeTokenMap>) => HookResult;
    'theme:mode:change': (change: ThemeModeChange) => HookResult;
  }
}

declare module '#app/nuxt' {
  interface NuxtApp {
    $themeTokens: ThemeTokensApi;
  }

  interface RuntimeNuxtHooks {
    'theme:tokens:ready': (api: ThemeTokensApi) => HookResult;
    'theme:tokens:applied': (tokens: Readonly<ThemeTokenMap>) => HookResult;
    'theme:mode:change': (change: ThemeModeChange) => HookResult;
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $themeTokens: ThemeTokensApi;
  }
}

declare module 'nuxt/schema' {
  interface PublicRuntimeConfig {
    /** Canonical SYS_ENV label (`local` | `development` | `test` | `production`). */
    sysEnv?: string;
    /** When true, primary nav shows an env chip (`$development`/`$test`; off in `$production`). */
    showEnvIndicator?: boolean;
    /** True when admin write APIs are expected to accept a configured token. */
    adminWritesEnabled?: boolean;
    theme?: {
      /** Initial mode preference when storage is empty. */
      mode?: 'light' | 'dark' | 'system';
      /** Preferred UI implementation stack (PrimeVue → Foundation → native). */
      uiStack?: 'primevue' | 'foundation' | 'native';
      bridges?: ThemeBridgeOptions;
      /** When false, skip auto-applying registered sources on mount (default true). */
      applySourcesOnMount?: boolean;
      /** When false, skip seeding color-mode defaults on plugin init (default true). */
      applyDefaultsOnInit?: boolean;
    };
  }
}

export {};
