import { adjustLightnessFor, Color, DEFAULT_PAPER_INK, palettes, sassColors, themeColors } from '@tgmc/theme';
import { describe, expect, it } from 'vitest';

import {
  BACKGROUND_MODES,
  backgroundCustomFor,
  BRAND_PACKS,
  brandRolesFromPack,
  DEFAULT_ACCENT_ID,
  DEFAULT_BACKGROUND_CUSTOM,
  DEFAULT_BACKGROUND_MODE,
  defaultBrandRoles,
  defaultPaperInk,
  paintedBackgroundCustom,
  resolveBackgroundCustom,
  STYLE_SETUP_ACTIVE_KEY,
  STYLE_SETUPS_KEY,
  withAccent,
  withPrimary,
  withSecondary,
} from '../shared/preferences';
import {
  COLOR_TOKENS_KEY,
  LEGACY_KEYS,
  PORTFOLIO_INK,
  PORTFOLIO_IVORY,
  resolveAccentId,
  resolveBackgroundMode,
  resolveBrandRolesState,
} from '../shared/preferences/document';
import { foucScript } from '../shared/preferences/fouc';
import { readLegacyPreferences } from '../shared/preferences/legacy';
import { buildBrandTokens, buildPresetBackgroundTokens, RUNTIME_COLOR_TOKEN_NAMES } from '../shared/preferences/paint';
import { resetPreferenceStorage } from '../shared/preferences/storage';

describe('portfolio personalization', () => {
  it('builds palette packs and light/dark single colors from theme JSON', () => {
    const palettesOnly = BRAND_PACKS.filter((pack) => pack.kind === 'palette');
    const colorsOnly = BRAND_PACKS.filter((pack) => pack.kind === 'color');
    expect(palettesOnly.map((pack) => pack.id)).toEqual(Object.keys(palettes));
    expect(colorsOnly.length).toBeGreaterThan(0);
    expect(DEFAULT_ACCENT_ID).toBeNull();
    expect(BRAND_PACKS.some((pack) => pack.id === 'ember' || pack.id === 'crimson')).toBe(false);
    const red = colorsOnly.find((pack) => pack.id === 'colorRed');
    expect(red?.primary.light.toLowerCase()).toBe(sassColors.cssRedLight.toLowerCase());
    expect(red?.primary.dark.toLowerCase()).toBe(sassColors.cssRedDark.toLowerCase());
    expect(brandRolesFromPack('colorRed', 'light').primary.toLowerCase()).toBe(red?.primary.light.toLowerCase());
    expect(brandRolesFromPack('colorRed', 'dark').primary.toLowerCase()).toBe(red?.primary.dark.toLowerCase());
    const redRoles = brandRolesFromPack('colorRed', 'dark');
    const redStyle = buildPresetBackgroundTokens('colorRed', redRoles, 'dark');
    expect(
      Color.contrastRatio(redStyle['--portfolio-primary-light-color']!, DEFAULT_PAPER_INK.light.paper)
    ).toBeGreaterThanOrEqual(3);
    expect(
      Color.contrastRatio(redStyle['--portfolio-primary-dark-color']!, DEFAULT_PAPER_INK.dark.paper)
    ).toBeGreaterThanOrEqual(3);
    // The background triad is the painted brand triad (owner ruling), so it is held to 3:1 on paper.
    expect(redStyle['--portfolio-background-primary-light-color']).toBe(redStyle['--portfolio-primary-light-color']);
    expect(redStyle['--portfolio-background-primary-dark-color']).toBe(redStyle['--portfolio-primary-dark-color']);
    expect(
      Color.contrastRatio(redStyle['--portfolio-secondary-light-color']!, DEFAULT_PAPER_INK.light.paper)
    ).toBeGreaterThanOrEqual(3);
    expect(
      Color.contrastRatio(redStyle['--portfolio-accent-dark-color']!, DEFAULT_PAPER_INK.dark.paper)
    ).toBeGreaterThanOrEqual(3);
    expect(
      Color.contrastRatio(redStyle['--portfolio-background-secondary-light-color']!, DEFAULT_PAPER_INK.light.paper)
    ).toBeGreaterThanOrEqual(3);
    expect(
      Color.contrastRatio(redStyle['--portfolio-background-accent-dark-color']!, DEFAULT_PAPER_INK.dark.paper)
    ).toBeGreaterThanOrEqual(3);
    expect(redStyle['--portfolio-primary-color']?.toLowerCase()).toBe(
      redStyle['--portfolio-primary-dark-color']?.toLowerCase()
    );
    const night = buildPresetBackgroundTokens(
      'darkNightGoldenDay',
      brandRolesFromPack('darkNightGoldenDay', 'dark'),
      'dark'
    );
    expect(night['--portfolio-background-primary-light-color']).toBeTruthy();
    expect(night['--portfolio-background-image']).toContain('radial-gradient');
    expect(night['--portfolio-background-image-dark']).toContain('radial-gradient');
    expect(night['--portfolio-background-accent-color']?.toLowerCase()).not.toBe(redRoles.primary.toLowerCase());
    expect(buildPresetBackgroundTokens(null, redRoles)).toEqual({});
    for (const preset of BRAND_PACKS) {
      // Both modes' variations from the pack's light / dark pair, whichever mode picked it (R-T3b).
      const dark = buildBrandTokens(brandRolesFromPack(preset.id, 'dark'), 'dark', undefined, preset.id);
      const light = buildBrandTokens(brandRolesFromPack(preset.id, 'light'), 'light', undefined, preset.id);
      expect(light).toEqual(dark);
      for (const mode of ['light', 'dark'] as const) {
        const { paper, ink } = DEFAULT_PAPER_INK[mode];
        expect(dark[`--theme-primary-${mode}-color`]).toBe(
          adjustLightnessFor(preset.primary[mode], paper, 3).toLowerCase()
        );
        expect(Color.contrastRatio(dark[`--theme-accent-${mode}-color`]!, paper)).toBeGreaterThanOrEqual(3);
        expect(Color.contrastRatio(ink, dark[`--theme-secondary-${mode}-background-color`]!)).toBeGreaterThanOrEqual(
          4.5
        );
        expect(Color.contrastRatio('#ffffff', dark[`--theme-primary-fill-${mode}-color`]!)).toBeGreaterThanOrEqual(4.5);
      }
      expect(
        Color.contrastRatio(dark['--theme-button-fg-dark-color']!, dark['--theme-primary-dark-color']!)
      ).toBeGreaterThanOrEqual(4.5);
      // Focus ring stays on the theme's AA focus variation, never the brand primary.
      expect(dark['--theme-focus-light-color']).toBeUndefined();
      expect(dark['--primary-color']).toBeUndefined();
      expect(buildBrandTokens(brandRolesFromPack(preset.id, 'dark'), 'dark', defaultPaperInk(), preset.id)).toEqual(
        dark
      );
    }
  });

  it('auto-fills secondary and accent from primary and honors overrides', () => {
    const auto = resolveBrandRolesState('#dc4256');
    expect(auto.secondaryLocked).toBe(false);
    expect(auto.accentLocked).toBe(false);
    expect(auto.accent.toLowerCase()).not.toBe(auto.primary.toLowerCase());

    const afterPrimary = withPrimary(auto, '#ff6b35');
    expect(afterPrimary.secondaryLocked).toBe(false);
    expect(afterPrimary.accentLocked).toBe(false);

    const overridden = withSecondary(afterPrimary, '#112233');
    expect(overridden.secondary.toLowerCase()).toBe('#112233');
    expect(overridden.secondaryLocked).toBe(true);

    const accented = withAccent(overridden, '#abcdef');
    expect(accented.accent.toLowerCase()).toBe('#abcdef');
    expect(accented.accentLocked).toBe(true);

    const primaryAgain = withPrimary(accented, '#ac1922');
    expect(primaryAgain.secondaryLocked).toBe(false);
    expect(primaryAgain.accentLocked).toBe(false);
    expect(primaryAgain.secondary.toLowerCase()).not.toBe('#112233');
  });

  it('falls back unknown and legacy accent ids to no pack', () => {
    expect(resolveAccentId('coral')).toBeNull();
    expect(resolveAccentId('ember')).toBeNull();
    expect(resolveAccentId('crimson')).toBeNull();
    expect(resolveAccentId(null)).toBeNull();
    expect(resolveAccentId('colorRed')).toBe('colorRed');
  });

  it('builds the FOUC script from the persisted variation map (no brand-role maths before paint)', () => {
    const script = foucScript();
    expect(script).toContain(`getItem('${COLOR_TOKENS_KEY}')`);
    for (const name of RUNTIME_COLOR_TOKEN_NAMES) expect(script).toContain(name);
    // R-T3e: the old runtime names and the in-head button-ink picker are gone.
    for (const old of ["'--primary-color'", "'--secondary-color'", "'--accent-color'", "'--button-fg'"])
      expect(script).not.toContain(old);
    expect(script).not.toContain('function bf(');
    expect(script).not.toContain('coral');
  });

  it('keeps button text ≥ 4.5:1 on its fill for near-threshold picks and every pack (dark ink / light white fill)', () => {
    const picks = ['#0077dd', '#4466ff', '#dc4256', '#ff6b35', '#ac1922', '#777777', '#d9531d'];
    const rolesList = [
      ...picks.map((p) => ({ roles: resolveBrandRolesState(p), pack: null as string | null })),
      ...BRAND_PACKS.map((preset) => ({ roles: brandRolesFromPack(preset.id, 'dark'), pack: preset.id })),
    ];
    for (const { roles, pack } of rolesList) {
      const tokens = buildBrandTokens(roles, 'dark', undefined, pack);
      expect(
        Color.contrastRatio(tokens['--theme-button-fg-dark-color']!, tokens['--theme-primary-dark-color']!),
        `${pack ?? roles.primary} dark`
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        Color.contrastRatio('#ffffff', tokens['--theme-primary-fill-light-color']!),
        `${pack ?? roles.primary} light fill`
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('uses theme Color / themeColors as the paper and pack SoT', () => {
    expect(PORTFOLIO_IVORY.toLowerCase()).toBe(themeColors.light.background.toLowerCase());
    expect(PORTFOLIO_INK.toLowerCase()).toBe(themeColors.dark.background.toLowerCase());
    expect(DEFAULT_BACKGROUND_CUSTOM.toLowerCase()).toBe(themeColors.dark.background.toLowerCase());

    const defaults = defaultBrandRoles('dark');
    expect(defaults.primary.toLowerCase()).toBe(themeColors.dark.primary.toLowerCase());
    expect(defaults.secondary.toLowerCase()).toBe(themeColors.dark.secondary.toLowerCase());
  });

  it('reads legacy accent packs that no longer exist as no pack and the default roles', () => {
    const values = new Map<string, string>([
      [LEGACY_KEYS.accent, 'crimson'],
      [LEGACY_KEYS.motion, 'reduced'],
    ]);
    const loaded = readLegacyPreferences({ getItem: (key: string) => values.get(key) ?? null });
    expect(loaded.accent).toBeNull();
    expect(loaded.brandRoles.primary.toLowerCase()).toBe(themeColors.dark.primary.toLowerCase());
    expect(loaded.motion).toBe('reduced');
    expect(loaded.background).toBe('particles');
  });

  it('falls back legacy coral storage to no pack', () => {
    const storage = {
      getItem: (key: string) => (key === LEGACY_KEYS.accent ? 'coral' : null),
    };
    expect(readLegacyPreferences(storage)).toMatchObject({
      accent: null,
      motion: 'system',
      background: 'particles',
      backgroundCustom: DEFAULT_BACKGROUND_CUSTOM,
    });
  });

  it('exposes Particles, Grid, Camera, and Custom background modes with a particles default', () => {
    expect(BACKGROUND_MODES.map((option) => option.value)).toEqual(['particles', 'grid', 'camera', 'custom']);
    expect(DEFAULT_BACKGROUND_MODE).toBe('particles');
    expect(resolveBackgroundMode(null)).toBe('particles');
    expect(resolveBackgroundMode('custom')).toBe('custom');
    expect(resolveBackgroundCustom(null).toLowerCase()).toBe(DEFAULT_BACKGROUND_CUSTOM.toLowerCase());
    expect(resolveBackgroundCustom('#abcdef').toLowerCase()).toBe('#abcdef');
  });

  it('an unpicked custom colour follows the active mode paper', () => {
    const paperInk = defaultPaperInk();
    for (const mode of ['light', 'dark'] as const) {
      expect(backgroundCustomFor(DEFAULT_BACKGROUND_CUSTOM, paperInk, mode)).toBe(paperInk[mode].paper);
      const doc = { backgroundCustom: DEFAULT_BACKGROUND_CUSTOM, paperInk } as Parameters<
        typeof paintedBackgroundCustom
      >[0];
      expect(paintedBackgroundCustom(doc, mode)).toBe(paperInk[mode].paper);
    }
    expect(backgroundCustomFor('#112233', paperInk, 'light')).toBe('#112233');
  });

  it('paints the custom fill so the active mode ink reads on it (≥ 4.5:1)', () => {
    const paperInk = defaultPaperInk();
    for (const backgroundCustom of [DEFAULT_BACKGROUND_CUSTOM, '#ffffff', '#facc15', '#1543fa']) {
      for (const mode of ['light', 'dark'] as const) {
        const doc = { backgroundCustom, paperInk } as Parameters<typeof paintedBackgroundCustom>[0];
        const painted = paintedBackgroundCustom(doc, mode);
        expect(Color.contrastRatio(paperInk[mode].ink, painted)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('reads and resets the legacy custom background color separately from mode', () => {
    const values = new Map<string, string>([
      [LEGACY_KEYS.background, 'custom'],
      [LEGACY_KEYS.backgroundCustom, '#112233'],
    ]);
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      removeItem: (key: string) => values.delete(key),
    };
    const loaded = readLegacyPreferences(storage);
    expect(loaded.background).toBe('custom');
    expect(loaded.backgroundCustom.toLowerCase()).toBe('#112233');
    expect(loaded.mode).toBe('system');
    resetPreferenceStorage(storage);
    expect(values.has(LEGACY_KEYS.backgroundCustom)).toBe(false);
  });

  it('clears style setup keys on resetPreferenceStorage', () => {
    const values = new Map<string, string>([
      [STYLE_SETUPS_KEY, '[]'],
      [STYLE_SETUP_ACTIVE_KEY, 'abc'],
      [LEGACY_KEYS.motion, 'system'],
    ]);
    resetPreferenceStorage({ removeItem: (key: string) => void values.delete(key) });
    expect(values.size).toBe(0);
  });
});
