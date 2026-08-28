import type { ThemeTokensApi } from '#shared/theme/theme-tokens-api';

/**
 * Access the `@tgmc/theme` token registry and color-mode API from components / composables.
 * Provided by `plugins/theme-tokens.client.ts`.
 *
 * @example
 * ```ts
 * const theme = useThemeTokens();
 * theme.setThemeMode('dark');
 * theme.subscribeThemeMode(({ resolved }) => console.log(resolved));
 * ```
 */
export function useThemeTokens(): ThemeTokensApi {
  const { $themeTokens } = useNuxtApp();
  if (!$themeTokens) {
    throw new Error(
      'useThemeTokens() requires the theme-tokens client plugin. Ensure app/plugins/theme-tokens.client.ts is present.'
    );
  }
  return $themeTokens;
}
