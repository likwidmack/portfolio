/**
 * Writes a global custom property on `:root`.
 * Delegates to `@tgmc/theme` — prefer `@tgmc/theme/tokens` or `useThemeTokens()` in new code.
 */
import { setThemeVariable } from '@tgmc/theme';

export function setCssVariable(property: string, value: string): void {
  setThemeVariable(property, value);
}
