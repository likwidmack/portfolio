import {
  ACCENT_KEY,
  applyStyleSetup,
  BACKGROUND_CUSTOM_CSS_VAR,
  BACKGROUND_CUSTOM_KEY,
  BACKGROUND_KEY,
  BACKGROUND_MODES,
  BRAND_PACKS,
  brandRolesFromPack,
  brandSwatchCatalog,
  buildBrandTokens,
  buildPaperInkTokens,
  buildPresetBackgroundTokens,
  DEFAULT_ACCENT_ID,
  DEFAULT_BACKGROUND_CUSTOM,
  DEFAULT_BACKGROUND_MODE,
  defaultBrandRoles,
  defaultPaperInk,
  deleteStyleSetup,
  loadActiveStyleSetupId,
  loadPersonalization,
  loadStyleSetups,
  MOTION_KEY,
  persistActiveStyleSetupId,
  persistBrandRoles,
  persistPaperInk,
  persistStyleSetups,
  PRESET_BACKGROUND_KEYS,
  resetPersonalization,
  resolveBackgroundCustom,
  restoreStyleSetup,
  snapshotFromLive,
  upsertStyleSetup,
  withAccent,
  withDerivedRole,
  withPaperInk,
  withPaperInkLinked,
  withPrimary,
  withSecondary,
  type BackgroundMode,
  type BrandPackId,
  type BrandRolesState,
  type MotionPreference,
  type PaperInkState,
  type StyleSetup,
  type StyleSetupMode,
} from '#shared/personalization';
import { Theme, type PaperInkPair } from '@tgmc/theme';
import type { ThemeModePreference } from '@tgmc/theme/tokens';

type PersistOpts = { persist?: boolean };

/** `@tgmc/theme` colour-mode storage key (default `initThemeMode` storageKey). */
const THEME_MODE_KEY = 'tgmc-theme-mode';

/**
 * Client personalization state for Personalize / Style Studio / OrbitStage / DepthField.
 * Applies brand CSS vars through `$themeTokens.updateTokens` (PrimeVue + Foundation bridges).
 * Custom background sets `--portfolio-depth-custom` on `:root` when mode is `custom`.
 * Style Studio passes `{ persist: false }` while drafting; Apply commits to localStorage.
 */
export function usePersonalization() {
  // The theme-token plugin is intentionally client-only. Resolve its injection
  // lazily so components using this composable remain safe during Nuxt SSR.
  let theme: ReturnType<typeof useThemeTokens> | undefined;
  const getTheme = () => (theme ??= useThemeTokens());
  const mode = useState<ThemeModePreference>('portfolio-theme-mode', () => 'system');
  const accent = useState<BrandPackId | null>('portfolio-accent', () => DEFAULT_ACCENT_ID);
  const brandRoles = useState<BrandRolesState>('portfolio-brand-roles', () => defaultBrandRoles('dark'));
  const motion = useState<MotionPreference>('portfolio-motion', () => 'system');
  const background = useState<BackgroundMode>('portfolio-background', () => DEFAULT_BACKGROUND_MODE);
  const backgroundCustom = useState<string>('portfolio-background-custom', () => DEFAULT_BACKGROUND_CUSTOM);
  const paperInk = useState<PaperInkState>('portfolio-paper-ink', defaultPaperInk);
  const styleSetups = useState<StyleSetup[]>('portfolio-style-setups', () => []);
  const activeSetupId = useState<string | null>('portfolio-style-setup-active', () => null);
  const initialized = useState<boolean>('portfolio-personalization-ready', () => false);
  const { track } = usePortfolioAnalytics();

  const applyBrandRoles = (next: BrandRolesState, persist = true) => {
    brandRoles.value = next;
    const theme = getTheme();
    const resolved = theme.getResolvedThemeMode();
    const presetTokens = buildPresetBackgroundTokens(accent.value, next, resolved, paperInk.value);
    if (import.meta.client) {
      const root = document.documentElement;
      for (const key of PRESET_BACKGROUND_KEYS) root.style.removeProperty(key);
    }
    theme.updateTokens(
      { ...buildBrandTokens(next, resolved), ...presetTokens },
      {
        ...theme.bridges,
        source: 'portfolio:brand-roles',
      }
    );
    if (import.meta.client && persist) {
      persistBrandRoles(localStorage, next);
    }
  };

  /** Pen & paper: write the resolved mode's `--paper` / `--ink` (every neutral role derives in CSS). */
  const applyPaperInk = (next: PaperInkState, persist = true) => {
    paperInk.value = next;
    const theme = getTheme();
    theme.updateTokens(buildPaperInkTokens(next, theme.getResolvedThemeMode()), {
      ...theme.bridges,
      source: 'portfolio:paper-ink',
    });
    if (import.meta.client && persist) {
      persistPaperInk(localStorage, next);
    }
  };

  /** Set paper (background) and ink (foreground) for one mode; linked → the other mode inverts. */
  const setPaperInk = (mode: 'light' | 'dark', pair: PaperInkPair, opts: PersistOpts = {}) => {
    applyPaperInk(withPaperInk(paperInk.value, mode, pair), opts.persist !== false);
  };

  /** Link / unlink the modes; linking re-derives the other mode from `from`. */
  const setPaperInkLinked = (linked: boolean, from: 'light' | 'dark', opts: PersistOpts = {}) => {
    applyPaperInk(withPaperInkLinked(paperInk.value, linked, from), opts.persist !== false);
  };

  const resetPaperInk = (opts: PersistOpts = {}) => {
    applyPaperInk(defaultPaperInk(), opts.persist !== false);
  };

  /** @deprecated Prefer {@link setPrimary} / {@link applyBrandPack}. */
  const applyAccent = (next: BrandPackId, persist = true) => {
    accent.value = next;
    applyBrandRoles(brandRolesFromPack(next, getTheme().getResolvedThemeMode()), persist);
    if (import.meta.client && persist) localStorage.setItem(ACCENT_KEY, next);
  };

  const applyMotion = (next: MotionPreference, persist = true) => {
    motion.value = next;
    if (import.meta.client) {
      document.documentElement.dataset.motion = next;
      if (persist) localStorage.setItem(MOTION_KEY, next);
    }
  };

  const syncBackgroundCustomCss = (hex: string, mode: BackgroundMode) => {
    if (!import.meta.client) return;
    const root = document.documentElement;
    // Depth field reads `--portfolio-depth-custom`; `data-background` aids CSS/debug selectors.
    if (mode === 'custom') {
      root.style.setProperty(BACKGROUND_CUSTOM_CSS_VAR, hex);
      root.dataset.background = 'custom';
    } else {
      root.style.removeProperty(BACKGROUND_CUSTOM_CSS_VAR);
      root.dataset.background = mode;
    }
  };

  const applyBackgroundCustom = (next: string, persist = true) => {
    const hex = resolveBackgroundCustom(next);
    backgroundCustom.value = hex;
    syncBackgroundCustomCss(hex, background.value);
    if (import.meta.client && persist) localStorage.setItem(BACKGROUND_CUSTOM_KEY, hex);
  };

  const applyBackground = (next: BackgroundMode, persist = true) => {
    background.value = next;
    if (next === 'custom') {
      // First enable: keep stored hex or auto-fill portfolio ink default.
      const hex = resolveBackgroundCustom(backgroundCustom.value || DEFAULT_BACKGROUND_CUSTOM);
      backgroundCustom.value = hex;
      syncBackgroundCustomCss(hex, 'custom');
      if (import.meta.client && persist) localStorage.setItem(BACKGROUND_CUSTOM_KEY, hex);
    } else {
      syncBackgroundCustomCss(backgroundCustom.value, next);
    }
    if (import.meta.client && persist) localStorage.setItem(BACKGROUND_KEY, next);
  };

  const reloadStyleSetups = () => {
    if (!import.meta.client) return;
    styleSetups.value = loadStyleSetups(localStorage);
    activeSetupId.value = loadActiveStyleSetupId(localStorage);
  };

  const setMode = (next: ThemeModePreference, opts: PersistOpts = {}) => {
    const persist = opts.persist !== false;
    mode.value = next;
    const theme = getTheme();
    theme.setThemeMode(next, { persist });
    const selected = BRAND_PACKS.find((pack) => pack.id === accent.value);
    const roles =
      selected?.kind === 'color' ? brandRolesFromPack(selected.id, theme.getResolvedThemeMode()) : brandRoles.value;
    applyBrandRoles(roles, persist);
    if (persist) {
      track('theme_changed', {
        mode: next,
        accent: accent.value,
        motion: motion.value,
        primary: brandRoles.value.primary,
      });
    }
  };

  const setAccent = (next: BrandPackId) => {
    applyAccent(next);
    track('theme_changed', { mode: mode.value, accent: next, motion: motion.value });
  };

  const applyBrandPack = (packId: BrandPackId, opts: PersistOpts = {}) => {
    const persist = opts.persist !== false;
    accent.value = packId;
    const next = brandRolesFromPack(packId, getTheme().getResolvedThemeMode());
    applyBrandRoles(next, persist);
    applyBackground(Theme.preset(packId)?.background ? 'custom' : DEFAULT_BACKGROUND_MODE, persist);
    if (import.meta.client && persist) localStorage.setItem(ACCENT_KEY, packId);
    if (persist) {
      track('theme_changed', {
        mode: mode.value,
        accent: packId,
        motion: motion.value,
        primary: next.primary,
      });
    }
  };

  const setPrimary = (hex: string, opts: PersistOpts = {}) => {
    const persist = opts.persist !== false;
    accent.value = null;
    if (import.meta.client && persist) localStorage.removeItem(ACCENT_KEY);
    const next = withPrimary(brandRoles.value, hex);
    applyBrandRoles(next, persist);
    applyBackground(DEFAULT_BACKGROUND_MODE, persist);
    if (persist) {
      track('theme_changed', {
        mode: mode.value,
        accent: accent.value,
        motion: motion.value,
        primary: next.primary,
      });
    }
  };

  const setSecondary = (hex: string, opts: PersistOpts = {}) => {
    const persist = opts.persist !== false;
    const next = withSecondary(brandRoles.value, hex);
    applyBrandRoles(next, persist);
    if (persist) {
      track('theme_changed', {
        mode: mode.value,
        accent: accent.value,
        motion: motion.value,
        secondary: next.secondary,
      });
    }
  };

  const setBrandAccent = (hex: string, opts: PersistOpts = {}) => {
    const persist = opts.persist !== false;
    const next = withAccent(brandRoles.value, hex);
    applyBrandRoles(next, persist);
    if (persist) {
      track('theme_changed', {
        mode: mode.value,
        accent: accent.value,
        motion: motion.value,
        brandAccent: next.accent,
      });
    }
  };

  /** Style Studio "Derive from primary" switch (draft-only unless `persist` is true). */
  const setRoleDerived = (role: 'secondary' | 'accent', derive: boolean, opts: PersistOpts = {}) => {
    applyBrandRoles(withDerivedRole(brandRoles.value, role, derive), opts.persist !== false);
  };

  const setMotion = (next: MotionPreference, opts: PersistOpts = {}) => {
    const persist = opts.persist !== false;
    applyMotion(next, persist);
    if (persist) {
      track('theme_changed', { mode: mode.value, accent: accent.value, motion: next });
    }
  };

  const setBackground = (next: BackgroundMode, opts: PersistOpts = {}) => {
    const persist = opts.persist !== false;
    applyBackground(next, persist);
    if (persist) {
      track('theme_changed', {
        mode: mode.value,
        accent: accent.value,
        motion: motion.value,
        background: next,
        backgroundCustom: backgroundCustom.value,
      });
    }
  };

  const setBackgroundCustom = (hex: string, opts: PersistOpts = {}) => {
    const persist = opts.persist !== false;
    applyBackgroundCustom(hex, persist);
    if (background.value !== 'custom') {
      applyBackground('custom', persist);
    }
    if (persist) {
      track('theme_changed', {
        mode: mode.value,
        accent: accent.value,
        motion: motion.value,
        background: 'custom',
        backgroundCustom: backgroundCustom.value,
      });
    }
  };

  /**
   * Apply a named setup to live state. Default persists flat keys + active id.
   * Style Studio draft load uses `{ persist: false, setActive: false }`.
   */
  const applySetup = (setup: StyleSetup, opts: PersistOpts & { setActive?: boolean } = {}) => {
    const persist = opts.persist !== false;
    const setActive = opts.setActive !== false;
    if (setup.mode) {
      mode.value = setup.mode;
      getTheme().setThemeMode(setup.mode);
    }
    applyBrandRoles(setup.brandRoles, persist);
    applyPaperInk(setup.paperInk ?? defaultPaperInk(), persist);
    applyMotion(setup.motion, persist);
    backgroundCustom.value = resolveBackgroundCustom(setup.backgroundCustom ?? DEFAULT_BACKGROUND_CUSTOM);
    applyBackground(setup.background, persist);
    if (import.meta.client && persist) {
      applyStyleSetup(localStorage, setup);
      if (setActive) {
        activeSetupId.value = setup.id;
        persistActiveStyleSetupId(localStorage, setup.id);
      }
    } else if (!persist && setActive) {
      activeSetupId.value = setup.id;
    }
    if (persist) {
      track('theme_changed', {
        mode: mode.value,
        accent: accent.value,
        motion: setup.motion,
        background: setup.background,
        setupId: setup.id,
      });
    }
  };

  /** Commit current in-memory prefs to localStorage (Style Studio Apply without Save). */
  const commitLive = (opts: { activeSetupId?: string | null } = {}) => {
    if (!import.meta.client) return;
    // A drafted colour mode was previewed with persist: false — commit it too.
    getTheme().setThemeMode(mode.value, { persist: true });
    persistBrandRoles(localStorage, brandRoles.value);
    persistPaperInk(localStorage, paperInk.value);
    localStorage.setItem(MOTION_KEY, motion.value);
    localStorage.setItem(BACKGROUND_KEY, background.value);
    localStorage.setItem(BACKGROUND_CUSTOM_KEY, backgroundCustom.value);
    if (opts.activeSetupId !== undefined) {
      activeSetupId.value = opts.activeSetupId;
      persistActiveStyleSetupId(localStorage, opts.activeSetupId);
    }
  };

  /** Revert in-memory state from committed localStorage (discard draft). */
  const revertToCommitted = () => {
    if (!import.meta.client) return;
    const theme = getTheme();
    // Restore the committed colour mode (a draft may have previewed another one).
    const committedMode = localStorage.getItem(THEME_MODE_KEY);
    const nextMode: ThemeModePreference =
      committedMode === 'light' || committedMode === 'dark' || committedMode === 'system' ? committedMode : 'system';
    if (nextMode !== theme.getThemeMode()) theme.setThemeMode(nextMode, { persist: false });
    mode.value = nextMode;
    const stored = loadPersonalization(localStorage);
    accent.value = stored.accent;
    applyBrandRoles(stored.brandRoles, false);
    applyPaperInk(stored.paperInk, false);
    applyMotion(stored.motion, false);
    backgroundCustom.value = stored.backgroundCustom;
    applyBackground(stored.background, false);
    reloadStyleSetups();
  };

  const saveSetup = (name: string, id?: string): StyleSetup => {
    const setup = snapshotFromLive({
      name,
      id,
      brandRoles: brandRoles.value,
      motion: motion.value,
      background: background.value,
      backgroundCustom: backgroundCustom.value,
      mode: mode.value as StyleSetupMode,
      paperInk: paperInk.value,
    });
    styleSetups.value = upsertStyleSetup(styleSetups.value, setup);
    if (import.meta.client) {
      persistStyleSetups(localStorage, styleSetups.value);
      commitLive({ activeSetupId: setup.id });
    }
    return setup;
  };

  const removeSetup = (id: string) => {
    const result = deleteStyleSetup(styleSetups.value, id, activeSetupId.value);
    styleSetups.value = result.setups;
    if (result.clearedActive) {
      activeSetupId.value = null;
    }
    if (import.meta.client) {
      persistStyleSetups(localStorage, styleSetups.value);
      if (result.clearedActive) {
        persistActiveStyleSetupId(localStorage, null);
      }
    }
  };

  /** Undo for `removeSetup`: restores position and, when it was active, the active id. */
  const restoreSetup = (setup: StyleSetup, index: number, wasActive: boolean) => {
    styleSetups.value = restoreStyleSetup(styleSetups.value, setup, index);
    if (wasActive) activeSetupId.value = setup.id;
    if (import.meta.client) {
      persistStyleSetups(localStorage, styleSetups.value);
      if (wasActive) persistActiveStyleSetupId(localStorage, setup.id);
    }
  };

  const reset = () => {
    if (import.meta.client) {
      resetPersonalization(localStorage);
    }
    mode.value = 'system';
    const theme = getTheme();
    theme.setThemeMode('system');
    accent.value = DEFAULT_ACCENT_ID;
    applyBrandRoles(defaultBrandRoles(theme.getResolvedThemeMode()), false);
    applyPaperInk(defaultPaperInk(), false);
    applyMotion('system', false);
    backgroundCustom.value = DEFAULT_BACKGROUND_CUSTOM;
    applyBackground(DEFAULT_BACKGROUND_MODE, false);
    styleSetups.value = [];
    activeSetupId.value = null;
    track('theme_changed', { mode: 'system', accent: DEFAULT_ACCENT_ID, motion: 'system' });
  };

  onMounted(() => {
    if (initialized.value) return;
    initialized.value = true;
    const theme = getTheme();
    // Restore the committed colour mode (a draft may have previewed another one).
    const committedMode = localStorage.getItem(THEME_MODE_KEY);
    const nextMode: ThemeModePreference =
      committedMode === 'light' || committedMode === 'dark' || committedMode === 'system' ? committedMode : 'system';
    if (nextMode !== theme.getThemeMode()) theme.setThemeMode(nextMode, { persist: false });
    mode.value = nextMode;
    const stored = loadPersonalization(localStorage);
    accent.value = stored.accent;
    applyBrandRoles(stored.brandRoles, false);
    applyPaperInk(stored.paperInk, false);
    applyMotion(stored.motion, false);
    backgroundCustom.value = stored.backgroundCustom;
    applyBackground(stored.background, false);
    reloadStyleSetups();
    theme.subscribeThemeMode(() => {
      applyBrandRoles(brandRoles.value, false);
      // Each mode has its own pen & paper pair.
      applyPaperInk(paperInk.value, false);
    });
  });

  return {
    mode,
    accent,
    brandRoles,
    paperInk,
    motion,
    background,
    backgroundCustom,
    styleSetups,
    activeSetupId,
    accents: BRAND_PACKS,
    brandPacks: BRAND_PACKS,
    swatches: brandSwatchCatalog(),
    backgrounds: BACKGROUND_MODES,
    setMode,
    setAccent,
    applyBrandPack,
    setPrimary,
    setSecondary,
    setBrandAccent,
    setPaperInk,
    setPaperInkLinked,
    resetPaperInk,
    setMotion,
    setBackground,
    setBackgroundCustom,
    applySetup,
    commitLive,
    revertToCommitted,
    saveSetup,
    removeSetup,
    restoreSetup,
    setRoleDerived,
    reloadStyleSetups,
    reset,
  };
}
