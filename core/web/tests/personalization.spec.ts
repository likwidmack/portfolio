import { Color, DEFAULT_PAPER_INK, palettes, sassColors, themeColors } from '@tgmc/theme';
import { describe, expect, it } from 'vitest';

import {
  ACCENT_KEY,
  ACCENT_PRESETS,
  applyStyleSetup,
  BACKGROUND_CUSTOM_KEY,
  BACKGROUND_MODES,
  BRAND_PACKS,
  BRAND_ROLES_KEY,
  brandRolesFromPack,
  buildAccentTokens,
  buildBrandTokens,
  buildPersonalizationFoucScript,
  buildPresetBackgroundTokens,
  createStyleSetupId,
  DEFAULT_ACCENT_COLOR,
  DEFAULT_ACCENT_ID,
  DEFAULT_BACKGROUND_CUSTOM,
  DEFAULT_BACKGROUND_MODE,
  defaultBrandRoles,
  deleteStyleSetup,
  loadActiveStyleSetupId,
  loadBrandRoles,
  loadPersonalization,
  loadStyleSetups,
  MOTION_KEY,
  persistActiveStyleSetupId,
  persistBrandRoles,
  persistStyleSetups,
  PORTFOLIO_INK,
  PORTFOLIO_IVORY,
  resetPersonalization,
  resolveAccentId,
  resolveBackgroundCustom,
  resolveBackgroundMode,
  resolveBrandRolesState,
  snapshotFromLive,
  STYLE_SETUP_ACTIVE_KEY,
  STYLE_SETUPS_KEY,
  upsertStyleSetup,
  withAccent,
  withPrimary,
  withSecondary,
} from '../shared/personalization';

describe('portfolio personalization', () => {
  it('builds palette packs and light/dark single colors from theme JSON', () => {
    const palettesOnly = BRAND_PACKS.filter((pack) => pack.kind === 'palette');
    const colorsOnly = BRAND_PACKS.filter((pack) => pack.kind === 'color');
    expect(palettesOnly.map((pack) => pack.id)).toEqual(Object.keys(palettes));
    expect(colorsOnly.length).toBeGreaterThan(0);
    expect(ACCENT_PRESETS).toEqual(BRAND_PACKS);
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
      Color.contrastRatio(redStyle['--portfolio-primary-light']!, DEFAULT_PAPER_INK.light.paper)
    ).toBeGreaterThanOrEqual(3);
    expect(
      Color.contrastRatio(redStyle['--portfolio-primary-dark']!, DEFAULT_PAPER_INK.dark.paper)
    ).toBeGreaterThanOrEqual(3);
    expect(
      Color.contrastRatio(redStyle['--portfolio-background-primary-light']!, DEFAULT_PAPER_INK.light.ink)
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      Color.contrastRatio(redStyle['--portfolio-background-primary-dark']!, DEFAULT_PAPER_INK.dark.ink)
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      Color.contrastRatio(redStyle['--portfolio-secondary-light']!, DEFAULT_PAPER_INK.light.paper)
    ).toBeGreaterThanOrEqual(3);
    expect(
      Color.contrastRatio(redStyle['--portfolio-accent-dark']!, DEFAULT_PAPER_INK.dark.paper)
    ).toBeGreaterThanOrEqual(3);
    expect(
      Color.contrastRatio(redStyle['--portfolio-background-secondary-light']!, DEFAULT_PAPER_INK.light.ink)
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      Color.contrastRatio(redStyle['--portfolio-background-accent-dark']!, DEFAULT_PAPER_INK.dark.ink)
    ).toBeGreaterThanOrEqual(4.5);
    expect(redStyle['--portfolio-primary']?.toLowerCase()).toBe(redStyle['--portfolio-primary-dark']?.toLowerCase());
    const night = buildPresetBackgroundTokens(
      'darkNightGoldenDay',
      brandRolesFromPack('darkNightGoldenDay', 'dark'),
      'dark'
    );
    expect(night['--portfolio-background-primary-light']).toBeTruthy();
    expect(night['--portfolio-background-image']).toContain('radial-gradient');
    expect(night['--portfolio-background-image-dark']).toContain('radial-gradient');
    expect(night['--portfolio-background-accent']?.toLowerCase()).not.toBe(redRoles.primary.toLowerCase());
    expect(buildPresetBackgroundTokens(null, redRoles)).toEqual({});
    for (const preset of BRAND_PACKS) {
      const roles = brandRolesFromPack(preset.id, 'dark');
      const dark = buildBrandTokens(roles, 'dark');
      const light = buildBrandTokens(brandRolesFromPack(preset.id, 'light'), 'light');
      expect(dark['--primary-color']!.toLowerCase()).toBe(preset.primary.dark.toLowerCase());
      expect(dark['--accent-color']!.toLowerCase()).not.toBe(dark['--primary-color']!.toLowerCase());
      // Focus ring stays on the theme's AA role (--focus-ring from @tgmc/theme), not the brand primary.
      expect(dark['--focus-ring']).toBeUndefined();
      expect(light['--primary-color']!.toLowerCase()).toBe(preset.primary.light.toLowerCase());
      expect(light['--button-fg']).toMatch(/^#/i);
      expect(buildAccentTokens(preset.id, 'dark')['--primary-color']!.toLowerCase()).toBe(
        preset.primary.dark.toLowerCase()
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

  it('builds FOUC script with brand roles (not accent=primary)', () => {
    const script = buildPersonalizationFoucScript();
    expect(script).toContain(BRAND_ROLES_KEY);
    expect(script).toContain(DEFAULT_ACCENT_COLOR);
    expect(script).toContain('--secondary-color');
    expect(script).toContain('--accent-color');
    expect(script).toContain('--button-fg');
    expect(script).not.toContain('coral');
    for (const preset of BRAND_PACKS) {
      expect(script).toContain(`${preset.id}:`);
    }
  });

  it('keeps FOUC button-fg aligned with buildBrandTokens / pickContrastingInk', () => {
    const script = buildPersonalizationFoucScript();
    // Evaluate the embedded bf() helper the same way the IIFE does.
    const helperMatch = script.match(/function bf\(p\)\{[\s\S]*?return cr\(li,bg\)>=cr\(di,bg\)\?'[^']+':'[^']+'\};/);
    expect(helperMatch?.[0]).toBeTruthy();

    // eslint-disable-next-line no-unused-vars -- function type parameter
    type ButtonFg = (hex: string) => string;
    const bf = new Function(`${helperMatch![0]}; return bf;`)() as ButtonFg;

    const nearThreshold = ['#0077dd', '#4466ff', '#dc4256', '#ff6b35', '#ac1922'];
    for (const primary of nearThreshold) {
      const roles = resolveBrandRolesState(primary);
      const tokens = buildBrandTokens(roles, 'dark');
      expect(bf(primary).toLowerCase()).toBe(tokens['--button-fg']!.toLowerCase());
    }

    for (const preset of BRAND_PACKS) {
      const roles = brandRolesFromPack(preset.id, 'dark');
      const tokens = buildBrandTokens(roles, 'dark');
      expect(bf(roles.primary).toLowerCase()).toBe(tokens['--button-fg']!.toLowerCase());
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

  it('persists brand roles and migrates legacy accent packs on load', () => {
    const values = new Map<string, string>([
      [ACCENT_KEY, 'crimson'],
      [MOTION_KEY, 'reduced'],
    ]);
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
      removeItem: (key: string) => values.delete(key),
    };
    const loaded = loadPersonalization(storage);
    expect(loaded.accent).toBeNull();
    expect(loaded.brandRoles.primary.toLowerCase()).toBe(themeColors.dark.primary.toLowerCase());
    expect(loaded.motion).toBe('reduced');
    expect(loaded.background).toBe('particles');

    persistBrandRoles(storage, defaultBrandRoles('dark'));
    expect(values.has(BRAND_ROLES_KEY)).toBe(true);
    expect(loadBrandRoles(storage).primary).toBe(defaultBrandRoles('dark').primary);

    resetPersonalization(storage);
    expect(values.size).toBe(0);
  });

  it('falls back legacy coral storage to crimson on load', () => {
    const storage = {
      getItem: (key: string) => (key === ACCENT_KEY ? 'coral' : null),
    };
    expect(loadPersonalization(storage)).toMatchObject({
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

  it('loads and resets custom background color separately from mode', () => {
    const values = new Map<string, string>([
      ['tgmc-background', 'custom'],
      [BACKGROUND_CUSTOM_KEY, '#112233'],
    ]);
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      removeItem: (key: string) => values.delete(key),
    };
    const loaded = loadPersonalization(storage);
    expect(loaded.background).toBe('custom');
    expect(loaded.backgroundCustom.toLowerCase()).toBe('#112233');
    resetPersonalization(storage);
    expect(values.has(BACKGROUND_CUSTOM_KEY)).toBe(false);
  });

  it('round-trips style setups and applies them onto live preference keys', () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
      removeItem: (key: string) => values.delete(key),
    };

    const setup = snapshotFromLive({
      name: 'Studio dusk',
      brandRoles: brandRolesFromPack('colorRed', 'dark'),
      motion: 'playful',
      background: 'grid',
      backgroundCustom: '#112233',
      mode: 'dark',
    });
    expect(setup.id).toBeTruthy();
    expect(createStyleSetupId()).not.toBe(setup.id);

    persistStyleSetups(storage, upsertStyleSetup([], setup));
    persistActiveStyleSetupId(storage, setup.id);
    expect(loadStyleSetups(storage)).toHaveLength(1);
    expect(loadActiveStyleSetupId(storage)).toBe(setup.id);

    const applied = applyStyleSetup(storage, setup);
    expect(applied.motion).toBe('playful');
    expect(applied.background).toBe('grid');
    expect(loadBrandRoles(storage).primary.toLowerCase()).toBe(setup.brandRoles.primary.toLowerCase());
    expect(values.get(MOTION_KEY)).toBe('playful');
    expect(values.get(BACKGROUND_CUSTOM_KEY)?.toLowerCase()).toBe('#112233');

    const renamed = snapshotFromLive({ ...setup, name: 'Studio dusk v2', id: setup.id });
    persistStyleSetups(storage, upsertStyleSetup(loadStyleSetups(storage), renamed));
    expect(loadStyleSetups(storage)[0]?.name).toBe('Studio dusk v2');

    const deleted = deleteStyleSetup(loadStyleSetups(storage), setup.id, setup.id);
    expect(deleted.setups).toHaveLength(0);
    expect(deleted.clearedActive).toBe(true);
    persistStyleSetups(storage, deleted.setups);
    if (deleted.clearedActive) persistActiveStyleSetupId(storage, null);
    expect(loadActiveStyleSetupId(storage)).toBeNull();
  });

  it('returns an empty setup list for corrupt JSON without touching live prefs', () => {
    const values = new Map<string, string>([
      [STYLE_SETUPS_KEY, '{not-json'],
      [BRAND_ROLES_KEY, JSON.stringify(defaultBrandRoles('dark'))],
    ]);
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
    };
    expect(loadStyleSetups(storage)).toEqual([]);
    expect(loadBrandRoles(storage).primary).toBe(defaultBrandRoles('dark').primary);
  });

  it('clears style setup keys on resetPersonalization', () => {
    const values = new Map<string, string>([
      [STYLE_SETUPS_KEY, '[]'],
      [STYLE_SETUP_ACTIVE_KEY, 'abc'],
      [MOTION_KEY, 'system'],
    ]);
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      removeItem: (key: string) => values.delete(key),
    };
    resetPersonalization(storage);
    expect(values.has(STYLE_SETUPS_KEY)).toBe(false);
    expect(values.has(STYLE_SETUP_ACTIVE_KEY)).toBe(false);
  });
});
