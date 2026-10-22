import {
  BACKGROUND_CUSTOM_CSS_VAR,
  BACKGROUND_MODES,
  backgroundCustomFor,
  BRAND_PACKS,
  brandRolesFromPack,
  brandSwatchCatalog,
  createStyleSetup,
  DEFAULT_ACCENT_ID,
  DEFAULT_BACKGROUND_CUSTOM,
  DEFAULT_BACKGROUND_MODE,
  defaultBrandRoles,
  defaultPaperInk,
  paintedBackgroundCustom,
  Preferences,
  resolveBackgroundCustom,
  STYLE_SETUP_ACTIVE_KEY,
  STYLE_SETUPS_KEY,
  withAccent,
  withBackgroundOption,
  withDerivedRole,
  withPaperInk,
  withPaperInkLinked,
  withPrimary,
  withSecondary,
  type BackgroundMode,
  type BackgroundOptions,
  type BackgroundOptionVariable,
  type BrandPackId,
  type BrandRolesState,
  type MotionPreference,
  type PaperInkState,
  type PreferenceDocument,
  type PreferenceStorage,
  type StyleSetup,
  type StyleSetupMode,
} from '#shared/preferences';
import { Theme, type PaperInkPair } from '@tgmc/theme';
import type { ThemeModePreference } from '@tgmc/theme/tokens';

import { resolvePreferenceStorage } from '../utils/preference-storage';
import { isStorageQuotaError } from '../utils/storage-quota';
import { toPlain } from '../utils/to-plain';

type PersistOpts = { persist?: boolean };

let resolvedStorage: PreferenceStorage | undefined;
/** Client only: reads `window.localStorage` on first use. */
const preferenceStorage = (): PreferenceStorage =>
  (resolvedStorage ??= resolvePreferenceStorage(() => window.localStorage));

/**
 * Client personalization adapter — Nuxt `useState` + analytics over Preferences.
 * Every paint goes through Preferences (`preview` / `commit` / `discard` / `setups.apply` →
 * `Theme.apply` / `Theme.remove`). Motion / depth-field chrome (`dataset`,
 * `--portfolio-depth-custom-color`) stay here; colour tokens do not.
 * Style Studio passes `{ persist: false }` while drafting; Apply commits via Preferences.
 * Storage: Preferences owns every key (`tgmc-preferences`, setups, colour map); commits paint now
 * and write after 250 ms. Blocked `localStorage` → an in-memory store (`resolvePreferenceStorage`).
 */
export function usePersonalization() {
  // Theme plugin is client-only; resolve lazily so SSR stays safe.
  let theme: ReturnType<typeof useThemeTokens> | undefined;
  const getTheme = () => (theme ??= useThemeTokens());
  const mode = useState<ThemeModePreference>('portfolio-theme-mode', () => 'system');
  const accent = useState<BrandPackId | null>('portfolio-accent', () => DEFAULT_ACCENT_ID);
  const brandRoles = useState<BrandRolesState>('portfolio-brand-roles', () => defaultBrandRoles('dark'));
  const motion = useState<MotionPreference>('portfolio-motion', () => 'system');
  const background = useState<BackgroundMode>('portfolio-background', () => DEFAULT_BACKGROUND_MODE);
  const backgroundCustom = useState<string>('portfolio-background-custom', () => DEFAULT_BACKGROUND_CUSTOM);
  const paperInk = useState<PaperInkState>('portfolio-paper-ink', defaultPaperInk);
  const backgroundOptions = useState<BackgroundOptions>('portfolio-background-options', () => ({}));
  const styleSetups = useState<StyleSetup[]>('portfolio-style-setups', () => []);
  const activeSetupId = useState<string | null>('portfolio-style-setup-active', () => null);
  const initialized = useState<boolean>('portfolio-personalization-ready', () => false);
  const { track } = usePortfolioAnalytics();

  const syncFromDoc = (doc: PreferenceDocument) => {
    mode.value = doc.mode;
    accent.value = doc.accent;
    brandRoles.value = doc.brandRoles;
    motion.value = doc.motion;
    background.value = doc.background;
    backgroundCustom.value = doc.backgroundCustom;
    paperInk.value = doc.paperInk;
    backgroundOptions.value = doc.backgroundOptions;
  };

  /** Motion dataset + depth-field custom fill — outside Preferences token paint. */
  const applyChrome = (doc: PreferenceDocument) => {
    if (!import.meta.client) return;
    const root = document.documentElement;
    root.dataset.motion = doc.motion;
    if (doc.background === 'custom') {
      const painted = paintedBackgroundCustom(doc, Theme.resolveMode(doc.mode));
      root.style.setProperty(BACKGROUND_CUSTOM_CSS_VAR, painted);
      root.dataset.background = 'custom';
    } else {
      root.style.removeProperty(BACKGROUND_CUSTOM_CSS_VAR);
      root.dataset.background = doc.background;
    }
  };

  /** Current in-memory prefs as a document (Studio draft or committed). */
  const currentDocument = (): PreferenceDocument =>
    toPlain({
      mode: mode.value as StyleSetupMode,
      accent: accent.value,
      brandRoles: brandRoles.value,
      motion: motion.value,
      background: background.value,
      backgroundCustom: backgroundCustom.value,
      paperInk: paperInk.value,
      backgroundOptions: backgroundOptions.value,
    });

  /** Setups are read-only cache entries; an active id without a stored setup counts as none. */
  const syncStyleSetups = () => {
    if (!import.meta.client) return;
    const setups = Preferences.setups.list(preferenceStorage());
    const activeId = Preferences.setups.getActiveId(preferenceStorage());
    styleSetups.value = setups;
    activeSetupId.value = activeId && setups.some((setup) => setup.id === activeId) ? activeId : null;
  };

  const ensurePreferences = () => {
    if (!import.meta.client) return false;
    if (initialized.value) return true;
    const doc = Preferences.load(preferenceStorage());
    getTheme().setThemeMode(doc.mode, { persist: false });
    syncFromDoc(doc);
    applyChrome(doc);
    Preferences.preview({});
    syncStyleSetups();
    Preferences.bindFlushOnHide(window);
    window.addEventListener('storage', (event) => {
      if (event.key !== null && event.key !== STYLE_SETUPS_KEY && event.key !== STYLE_SETUP_ACTIVE_KEY) return;
      Preferences.setups.reload(preferenceStorage());
      syncStyleSetups();
    });
    initialized.value = true;
    getTheme().subscribeThemeMode(() => {
      // Colour map survives mode switch; preset `--portfolio-*-color` layer needs a re-paint.
      const painted = Preferences.preview({});
      syncFromDoc(painted);
      applyChrome(painted);
    });
    return true;
  };

  /** Loads Preferences first, so old-shape setups are converted before they are listed. */
  const reloadStyleSetups = () => {
    if (ensurePreferences()) syncStyleSetups();
  };

  /** Patch Preferences draft; `{ persist: true }` commits storage. */
  const applyPatch = (patch: Partial<PreferenceDocument>, persist: boolean) => {
    if (!import.meta.client) {
      if (patch.mode !== undefined) mode.value = patch.mode;
      if (patch.accent !== undefined) accent.value = patch.accent;
      if (patch.brandRoles !== undefined) brandRoles.value = patch.brandRoles;
      if (patch.motion !== undefined) motion.value = patch.motion;
      if (patch.background !== undefined) background.value = patch.background;
      if (patch.backgroundCustom !== undefined) backgroundCustom.value = patch.backgroundCustom;
      if (patch.paperInk !== undefined) paperInk.value = patch.paperInk;
      if (patch.backgroundOptions !== undefined) backgroundOptions.value = patch.backgroundOptions;
      return;
    }

    if (!ensurePreferences()) return;

    // Preview before setThemeMode: mode subscribe fires synchronously and would
    // otherwise paint from a stale Preferences draft.mode.
    const doc = Preferences.preview(toPlain(patch));
    syncFromDoc(doc);
    applyChrome(doc);
    if (patch.mode !== undefined) {
      getTheme().setThemeMode(patch.mode, { persist: false });
    }
    if (persist) {
      Preferences.commit(preferenceStorage());
    }
  };

  const setBackgroundOption = (variable: BackgroundOptionVariable, value: string | null, opts: PersistOpts = {}) => {
    applyPatch(
      { backgroundOptions: withBackgroundOption(backgroundOptions.value, variable, value) },
      opts.persist !== false
    );
  };

  const setPaperInk = (inkMode: 'light' | 'dark', pair: PaperInkPair, opts: PersistOpts = {}) => {
    applyPatch({ paperInk: withPaperInk(paperInk.value, inkMode, pair) }, opts.persist !== false);
  };

  const setPaperInkLinked = (linked: boolean, from: 'light' | 'dark', opts: PersistOpts = {}) => {
    applyPatch({ paperInk: withPaperInkLinked(paperInk.value, linked, from) }, opts.persist !== false);
  };

  const resetPaperInk = (opts: PersistOpts = {}) => {
    applyPatch({ paperInk: defaultPaperInk() }, opts.persist !== false);
  };

  /** @deprecated Prefer {@link setPrimary} / {@link applyBrandPack}. */
  const applyAccent = (next: BrandPackId, persist = true) => {
    const resolved =
      import.meta.client && ensurePreferences()
        ? getTheme().getResolvedThemeMode()
        : Theme.resolveMode(
            mode.value === 'light' || mode.value === 'dark' || mode.value === 'system' ? mode.value : 'system'
          );
    const roles = brandRolesFromPack(next, resolved);
    applyPatch({ accent: next, brandRoles: roles }, persist);
  };

  const setMode = (next: ThemeModePreference, opts: PersistOpts = {}) => {
    const persist = opts.persist !== false;
    const selected = BRAND_PACKS.find((pack) => pack.id === accent.value);
    const resolved = Theme.resolveMode(next === 'light' || next === 'dark' || next === 'system' ? next : 'system');
    const roles = selected?.kind === 'color' ? brandRolesFromPack(selected.id, resolved) : brandRoles.value;
    applyPatch({ mode: next, brandRoles: roles }, persist);
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
    const resolved = import.meta.client ? getTheme().getResolvedThemeMode() : 'dark';
    const next = brandRolesFromPack(packId, resolved);
    const nextBackground = Theme.preset(packId)?.background ? 'custom' : DEFAULT_BACKGROUND_MODE;
    // A "no image" left by a custom fill pick yields to the chosen pack's image; a chosen image stays.
    const imageCleared = backgroundOptions.value['--portfolio-background-image'] === 'none';
    applyPatch(
      {
        accent: packId,
        brandRoles: next,
        background: nextBackground,
        ...(imageCleared
          ? { backgroundOptions: withBackgroundOption(backgroundOptions.value, '--portfolio-background-image', null) }
          : {}),
      },
      persist
    );
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
    const next = withPrimary(brandRoles.value, hex);
    applyPatch({ accent: null, brandRoles: next, background: DEFAULT_BACKGROUND_MODE }, persist);
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
    applyPatch({ brandRoles: next }, persist);
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
    applyPatch({ brandRoles: next }, persist);
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
    applyPatch({ brandRoles: withDerivedRole(brandRoles.value, role, derive) }, opts.persist !== false);
  };

  const setMotion = (next: MotionPreference, opts: PersistOpts = {}) => {
    const persist = opts.persist !== false;
    applyPatch({ motion: next }, persist);
    if (persist) {
      track('theme_changed', { mode: mode.value, accent: accent.value, motion: next });
    }
  };

  const setBackground = (next: BackgroundMode, opts: PersistOpts = {}) => {
    const persist = opts.persist !== false;
    if (next === 'custom') {
      const hex = resolveBackgroundCustom(backgroundCustom.value || DEFAULT_BACKGROUND_CUSTOM);
      applyPatch({ background: 'custom', backgroundCustom: hex }, persist);
    } else {
      applyPatch({ background: next }, persist);
    }
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

  /**
   * A picked fill replaces the pack's image layer (which would otherwise paint over it) unless the
   * visitor chose an image; clearing Background → Image brings the pack image back.
   */
  const setBackgroundCustom = (hex: string, opts: PersistOpts = {}) => {
    const persist = opts.persist !== false;
    const resolved = resolveBackgroundCustom(hex);
    const imageChosen = Boolean(backgroundOptions.value['--portfolio-background-image']);
    applyPatch(
      {
        backgroundCustom: resolved,
        background: 'custom',
        ...(imageChosen
          ? {}
          : {
              backgroundOptions: withBackgroundOption(backgroundOptions.value, '--portfolio-background-image', 'none'),
            }),
      },
      persist
    );
    if (persist) {
      track('theme_changed', {
        mode: mode.value,
        accent: accent.value,
        motion: motion.value,
        background: 'custom',
        backgroundCustom: resolved,
      });
    }
  };

  /** Commit the setup now; when storage is full it stays painted and committed for this visit. */
  const commitSetup = (setup: StyleSetup): PreferenceDocument => {
    try {
      return Preferences.setups.apply(preferenceStorage(), setup);
    } catch (error) {
      if (!isStorageQuotaError(error)) throw error;
      Preferences.preview(setup.document);
      return Preferences.commit(preferenceStorage());
    }
  };

  /**
   * Apply a named setup to live state. Default commits its document + active id.
   * Style Studio draft load uses `{ persist: false, setActive: true }`.
   */
  const applySetup = (setup: StyleSetup, opts: PersistOpts & { setActive?: boolean } = {}) => {
    const persist = opts.persist !== false;
    const setActive = opts.setActive !== false;
    const plain = toPlain(setup);

    if (persist && import.meta.client) {
      ensurePreferences();
      // Apply (seed draft + paint) before setThemeMode so subscribe sees updated draft.mode.
      const doc = commitSetup(plain);
      syncFromDoc(doc);
      applyChrome(doc);
      getTheme().setThemeMode(doc.mode, { persist: false });
      syncStyleSetups();
      if (setActive) activeSetupId.value = plain.id;
      track('theme_changed', {
        mode: mode.value,
        accent: accent.value,
        motion: doc.motion,
        background: doc.background,
        setupId: plain.id,
      });
      return;
    }

    applyPatch({ ...plain.document }, false);
    if (setActive) activeSetupId.value = plain.id;
  };

  /** Commit current in-memory prefs to localStorage (Style Studio Apply without Save). */
  const commitLive = (opts: { activeSetupId?: string | null } = {}) => {
    if (!ensurePreferences()) return;
    // Align draft before setThemeMode so mode subscribe does not paint stale mode.
    Preferences.preview(currentDocument());
    Preferences.commit(preferenceStorage());
    getTheme().setThemeMode(mode.value, { persist: false });
    if (opts.activeSetupId !== undefined) {
      Preferences.setups.setActiveId(preferenceStorage(), opts.activeSetupId);
      activeSetupId.value = opts.activeSetupId;
    }
  };

  /** Revert in-memory state from committed localStorage (discard draft). */
  const revertToCommitted = () => {
    if (!ensurePreferences()) return;
    const doc = Preferences.discard();
    getTheme().setThemeMode(doc.mode, { persist: false });
    syncFromDoc(doc);
    applyChrome(doc);
    syncStyleSetups();
  };

  /**
   * Save the current prefs as a named setup and commit them. `null` when the setup limit is reached.
   * A full browser store throws (`isStorageQuotaError`) before anything is committed.
   */
  const saveSetup = (name: string, id?: string): StyleSetup | null => {
    const setup = createStyleSetup(name, currentDocument(), id);
    if (import.meta.client) {
      ensurePreferences();
      const result = Preferences.setups.save(preferenceStorage(), setup);
      styleSetups.value = result.setups;
      if (!result.ok) return null;
      commitLive({ activeSetupId: setup.id });
    } else {
      styleSetups.value = [...styleSetups.value.filter((item) => item.id !== setup.id), setup];
      activeSetupId.value = setup.id;
    }
    return setup;
  };

  /** The live id can be a draft selection that was never stored, so it is cleared by id, not by `clearedActive`. */
  const removeSetup = (id: string) => {
    if (import.meta.client) {
      ensurePreferences();
      styleSetups.value = Preferences.setups.delete(preferenceStorage(), id).setups;
    } else {
      styleSetups.value = styleSetups.value.filter((item) => item.id !== id);
    }
    if (activeSetupId.value === id) activeSetupId.value = null;
  };

  /**
   * Undo for `removeSetup`: restores position and, when it was active, the active id.
   * `false` when the setup limit is reached (nothing restored).
   */
  const restoreSetup = (setup: StyleSetup, index: number, wasActive: boolean): boolean => {
    const plain = toPlain(setup);
    if (import.meta.client) {
      ensurePreferences();
      const result = Preferences.setups.restore(preferenceStorage(), plain, index);
      styleSetups.value = result.setups;
      if (!result.ok) return false;
      if (wasActive) Preferences.setups.setActiveId(preferenceStorage(), plain.id);
    } else {
      const at = Math.max(0, Math.min(index, styleSetups.value.length));
      styleSetups.value = [...styleSetups.value.slice(0, at), plain, ...styleSetups.value.slice(at)];
    }
    if (wasActive) activeSetupId.value = plain.id;
    return true;
  };

  const reset = () => {
    if (import.meta.client) {
      if (!ensurePreferences()) return;
      const doc = Preferences.reset(preferenceStorage());
      getTheme().setThemeMode(doc.mode, { persist: false });
      syncFromDoc(doc);
      applyChrome(doc);
      Preferences.preview({});
      syncStyleSetups();
    } else {
      mode.value = 'system';
      accent.value = DEFAULT_ACCENT_ID;
      brandRoles.value = defaultBrandRoles('dark');
      paperInk.value = defaultPaperInk();
      backgroundOptions.value = {};
      motion.value = 'system';
      backgroundCustom.value = DEFAULT_BACKGROUND_CUSTOM;
      background.value = DEFAULT_BACKGROUND_MODE;
      styleSetups.value = [];
      activeSetupId.value = null;
    }
    track('theme_changed', { mode: 'system', accent: DEFAULT_ACCENT_ID, motion: 'system' });
  };

  onMounted(() => {
    ensurePreferences();
  });

  /** Custom field value: the visitor's pick, else the active mode's paper. */
  const backgroundCustomShown = computed(() =>
    backgroundCustomFor(backgroundCustom.value, paperInk.value, Theme.resolveMode(mode.value))
  );

  return {
    mode,
    accent,
    brandRoles,
    paperInk,
    backgroundOptions,
    motion,
    background,
    backgroundCustom,
    backgroundCustomShown,
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
    setBackgroundOption,
    resetPaperInk,
    setMotion,
    setBackground,
    setBackgroundCustom,
    applySetup,
    currentDocument,
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
