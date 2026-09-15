import {
  ACCENT_KEY,
  ACCENT_PRESETS,
  BACKGROUND_KEY,
  BACKGROUND_MODES,
  buildAccentTokens,
  DEFAULT_ACCENT_ID,
  DEFAULT_BACKGROUND_MODE,
  loadPersonalization,
  MOTION_KEY,
  resetPersonalization,
  type AccentId,
  type BackgroundMode,
  type MotionPreference,
} from '#shared/personalization';
import type { ThemeModePreference } from '@tgmc/theme/tokens';

export function usePersonalization() {
  // The theme-token plugin is intentionally client-only. Resolve its injection
  // lazily so components using this composable remain safe during Nuxt SSR.
  let theme: ReturnType<typeof useThemeTokens> | undefined;
  const getTheme = () => (theme ??= useThemeTokens());
  const mode = useState<ThemeModePreference>('portfolio-theme-mode', () => 'system');
  const accent = useState<AccentId>('portfolio-accent', () => DEFAULT_ACCENT_ID);
  const motion = useState<MotionPreference>('portfolio-motion', () => 'system');
  const background = useState<BackgroundMode>('portfolio-background', () => DEFAULT_BACKGROUND_MODE);
  const initialized = useState<boolean>('portfolio-personalization-ready', () => false);
  const { track } = usePortfolioAnalytics();

  const applyAccent = (next: AccentId, persist = true) => {
    accent.value = next;
    const theme = getTheme();
    const resolved = theme.getResolvedThemeMode();
    theme.updateTokens(buildAccentTokens(next, resolved), {
      ...theme.bridges,
      source: 'portfolio:accent',
    });
    if (import.meta.client && persist) localStorage.setItem(ACCENT_KEY, next);
  };

  const applyMotion = (next: MotionPreference, persist = true) => {
    motion.value = next;
    if (import.meta.client) {
      document.documentElement.dataset.motion = next;
      if (persist) localStorage.setItem(MOTION_KEY, next);
    }
  };

  const setMode = (next: ThemeModePreference) => {
    mode.value = next;
    const theme = getTheme();
    theme.setThemeMode(next);
    applyAccent(accent.value, false);
    track('theme_changed', { mode: next, accent: accent.value, motion: motion.value });
  };

  const setAccent = (next: AccentId) => {
    applyAccent(next);
    track('theme_changed', { mode: mode.value, accent: next, motion: motion.value });
  };

  const setMotion = (next: MotionPreference) => {
    applyMotion(next);
    track('theme_changed', { mode: mode.value, accent: accent.value, motion: next });
  };

  const applyBackground = (next: BackgroundMode, persist = true) => {
    background.value = next;
    if (import.meta.client && persist) localStorage.setItem(BACKGROUND_KEY, next);
  };

  const setBackground = (next: BackgroundMode) => {
    applyBackground(next);
    track('theme_changed', { mode: mode.value, accent: accent.value, motion: motion.value, background: next });
  };

  const reset = () => {
    if (import.meta.client) {
      resetPersonalization(localStorage);
    }
    mode.value = 'system';
    const theme = getTheme();
    theme.setThemeMode('system');
    applyAccent(DEFAULT_ACCENT_ID, false);
    applyMotion('system', false);
    applyBackground(DEFAULT_BACKGROUND_MODE, false);
    track('theme_changed', { mode: 'system', accent: DEFAULT_ACCENT_ID, motion: 'system' });
  };

  onMounted(() => {
    if (initialized.value) return;
    initialized.value = true;
    const theme = getTheme();
    mode.value = theme.getThemeMode();
    const stored = loadPersonalization(localStorage);
    applyAccent(stored.accent, false);
    applyMotion(stored.motion, false);
    applyBackground(stored.background, false);
    theme.subscribeThemeMode(() => applyAccent(accent.value, false));
  });

  return {
    mode,
    accent,
    motion,
    background,
    accents: ACCENT_PRESETS,
    backgrounds: BACKGROUND_MODES,
    setMode,
    setAccent,
    setMotion,
    setBackground,
    reset,
  };
}
