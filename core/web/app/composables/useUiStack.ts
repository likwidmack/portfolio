/**
 * Resolves which UI implementation stack the app should prefer.
 * Order: configured preference, then PrimeVue → Foundation → native HTML.
 */
export type UiStack = 'primevue' | 'foundation' | 'native';

type ThemePublicConfig = {
  uiStack?: UiStack;
  bridges?: {
    primevue?: boolean;
    foundation?: boolean;
  };
};

type BridgeAvailability = {
  preferred: UiStack;
  primevueAvailable: boolean;
  foundationAvailable: boolean;
};

/** Pure resolver — preferred stack when available, else first available fallback. */
export function resolveUiStack({ preferred, primevueAvailable, foundationAvailable }: BridgeAvailability): UiStack {
  if (preferred === 'primevue' && primevueAvailable) return 'primevue';
  if (preferred === 'foundation' && foundationAvailable) return 'foundation';
  if (preferred === 'native') return 'native';
  if (primevueAvailable) return 'primevue';
  if (foundationAvailable) return 'foundation';
  return 'native';
}

/** Returns the active UI stack from runtime config with safe fallbacks. */
export function useUiStack(): {
  stack: UiStack;
  isPrimeVue: boolean;
  isFoundation: boolean;
  isNative: boolean;
} {
  const theme = useRuntimeConfig().public.theme as ThemePublicConfig | undefined;
  // PrimeVue Nuxt module is registered for `@tgmc/web` unless explicitly disabled.
  // Foundation is CSS-bridge based in this app (no Vue Foundation kit).
  const stack = resolveUiStack({
    preferred: theme?.uiStack ?? 'primevue',
    primevueAvailable: theme?.bridges?.primevue !== false,
    foundationAvailable: theme?.bridges?.foundation === true,
  });

  return {
    stack,
    isPrimeVue: stack === 'primevue',
    isFoundation: stack === 'foundation',
    isNative: stack === 'native',
  };
}
