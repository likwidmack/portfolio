import {
  adjustLightnessFor,
  buildColorVariations,
  buildPrimaryInkTokens,
  buildSecondaryInkTokens,
  buildStatusInkTokens,
  buildWashTokens,
  Color,
  DEFAULT_COLOR_SOURCES,
  DEFAULT_PAPER_INK,
  SOLID_COLORS,
  STATUS_COLORS,
  textGroundsFor,
  Theme,
} from '@tgmc/theme';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as sass from 'sass';
import { describe, expect, it } from 'vitest';

import {
  BRAND_PACKS,
  brandRolesFromPack,
  defaultBrandRoles,
  defaultPaperInk,
  paintedPackColors,
  withPaperInk,
} from '../shared/preferences';
import { COLOR_TOKENS_KEY, resolveBrandRolesState } from '../shared/preferences/document';
import { foucScript } from '../shared/preferences/fouc';
import {
  brandColorSources,
  buildBrandTokens,
  buildPaperInkTokens,
  buildPresetBackgroundTokens,
  buildRuntimeColorTokens,
  COLOR_TOKENS_MAX_LENGTH,
  loadColorTokens,
  RUNTIME_COLOR_TOKEN_NAMES,
  sanitizeColorTokenMap,
} from '../shared/preferences/paint';
import {
  defaultPreferenceDocument,
  persistPreferenceDocument,
  resetPreferenceStorage,
} from '../shared/preferences/storage';

/**
 * Colour system Task 3 (rulings R-T3a/b/e/f): Style Studio writes the per-mode
 * `--theme-…-{light,dark}{,-background}-color` variations for both modes at once; the stylesheet
 * points the active names at them, and the FOUC script re-applies the persisted map before paint.
 */
const ratio = (a: string, b: string) => Color.contrastRatio(a, b);
const { light, dark } = DEFAULT_PAPER_INK;

function memoryStorage(seed: Record<string, string> = {}) {
  const values = new Map(Object.entries(seed));
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
    removeItem: (key: string) => void values.delete(key),
  };
}

describe('brand variations (R-T3b)', () => {
  const roles = resolveBrandRolesState('#dc4256');
  const tokens = buildBrandTokens(roles, 'dark', defaultPaperInk());

  it('writes both modes’ variations for a pick, and no old --primary-color / --button-fg key', () => {
    expect(ratio(tokens['--theme-primary-light-color']!, light.paper)).toBeGreaterThanOrEqual(3);
    expect(ratio(tokens['--theme-primary-dark-color']!, dark.paper)).toBeGreaterThanOrEqual(3);
    expect(ratio(dark.ink, tokens['--theme-primary-dark-background-color']!)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(light.ink, tokens['--theme-primary-light-background-color']!)).toBeGreaterThanOrEqual(4.5);
    for (const old of ['--primary-color', '--secondary-color', '--accent-color', '--button-fg', '--paper', '--ink'])
      expect(tokens[old], old).toBeUndefined();
    for (const c of ['primary', 'secondary', 'accent'])
      for (const v of ['light', 'dark', 'light-background', 'dark-background'])
        expect(tokens[`--theme-${c}-${v}-color`], `${c} ${v}`).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('keeps button text ≥ 4.5:1 on the fill it sits on in both modes (fix round 1, option C)', () => {
    // Dark: the per-mode ink on the dark primary variation.
    expect(
      ratio(tokens['--theme-button-fg-dark-color']!, tokens['--theme-primary-dark-color']!)
    ).toBeGreaterThanOrEqual(4.5);
    // Light: white on the primary fill — the primary with only its lightness moved.
    expect(tokens['--theme-button-fg-light-color']).toBeUndefined();
    for (const mode of ['light', 'dark'] as const) {
      const fill = tokens[`--theme-primary-fill-${mode}-color`]!;
      expect(ratio('#ffffff', fill), mode).toBeGreaterThanOrEqual(4.5);
      expect(Color.create(fill).h, mode).toBeCloseTo(Color.create(tokens[`--theme-primary-${mode}-color`]!).h, 0);
    }
  });

  it('adjusts a custom pick below 3:1 (spec intent): the same pick is the source for both modes', () => {
    const pale = resolveBrandRolesState('#f4c2c2'); // ~1.4:1 on light paper
    expect(brandColorSources(pale, null).primary).toEqual({ light: '#f4c2c2', dark: '#f4c2c2' });
    const t = buildBrandTokens(pale, 'light', defaultPaperInk());
    expect(t['--theme-primary-light-color']).not.toBe('#f4c2c2');
    expect(ratio(t['--theme-primary-light-color']!, light.paper)).toBeGreaterThanOrEqual(3);
    expect(t['--theme-primary-dark-color']).toBe('#f4c2c2'); // already reads on dark paper
  });

  it('uses a pack’s light / dark pair as the per-mode sources, whichever mode picked it', () => {
    for (const mode of ['light', 'dark'] as const) {
      const sources = brandColorSources(brandRolesFromPack('colorRed', mode), 'colorRed');
      const preset = Theme.preset('colorRed')!;
      expect(sources.primary).toEqual({ light: preset.primary.light, dark: preset.primary.dark });
    }
  });

  it('uses the theme’s own pair for the default roles, so the default site matches the stylesheet', () => {
    for (const mode of ['light', 'dark'] as const) {
      const sources = brandColorSources(defaultBrandRoles(mode), null);
      for (const c of ['primary', 'secondary', 'accent'] as const)
        expect(sources[c], `${mode} ${c}`).toEqual(DEFAULT_COLOR_SOURCES[c]);
    }
  });

  it('is recomputed against the current paper / ink', () => {
    const paperInk = withPaperInk(defaultPaperInk(), 'light', { paper: '#ffd9d9', ink: '#1a1a2e' });
    const t = buildBrandTokens(roles, 'light', paperInk);
    expect(ratio(t['--theme-primary-light-color']!, '#ffd9d9')).toBeGreaterThanOrEqual(3);
    expect(ratio('#1a1a2e', t['--theme-primary-light-background-color']!)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('primary ink (--theme-primary-ink-{light,dark}-color — brand small text ≥ 4.5:1)', () => {
  /** Worst ratio of `fg` on every ground text sits on in `mode` (page, secondary, surface, variant). */
  const worstOn = (fg: string, pair: { paper: string; ink: string }, mode: 'light' | 'dark') =>
    Math.min(...textGroundsFor(pair, mode).map((g) => ratio(fg, g)));

  it('a pick writes both modes’ primary ink, recomputed from the pick', () => {
    const pick = buildBrandTokens(resolveBrandRolesState('#dc4256'), 'dark', defaultPaperInk());
    const defaults = buildPrimaryInkTokens(DEFAULT_COLOR_SOURCES, DEFAULT_PAPER_INK);
    for (const mode of ['light', 'dark'] as const) {
      const hex = pick[`--theme-primary-ink-${mode}-color`]!;
      expect(hex, mode).toMatch(/^#[0-9a-f]{6}$/);
      expect(worstOn(hex, DEFAULT_PAPER_INK[mode], mode), mode).toBeGreaterThanOrEqual(4.5);
      expect(Color.create(hex).h, `${mode} hue`).toBeCloseTo(Color.create('#dc4256').h, 0);
      expect(hex, `${mode} differs from the default`).not.toBe(defaults[`--theme-primary-ink-${mode}-color`]);
    }
  });

  it('a pack pick uses the pack’s per-mode primary', () => {
    const preset = Theme.preset('colorBlue')!;
    const t = buildBrandTokens(brandRolesFromPack('colorBlue', 'light'), 'light', defaultPaperInk(), 'colorBlue');
    expect(t['--theme-primary-ink-light-color']).toBe(
      buildPrimaryInkTokens({ primary: preset.primary }, DEFAULT_PAPER_INK)['--theme-primary-ink-light-color']
    );
  });

  it('is recomputed when the paper / ink change (even with the default roles)', () => {
    const paperInk = withPaperInk(defaultPaperInk(), 'light', { paper: '#ffd9d9', ink: '#1a1a2e' });
    const map = buildRuntimeColorTokens(defaultBrandRoles('light'), paperInk, null)!;
    const hex = map['--theme-primary-ink-light-color']!;
    expect(worstOn(hex, paperInk.light, 'light')).toBeGreaterThanOrEqual(4.5);
    expect(hex).toBe(buildPrimaryInkTokens(DEFAULT_COLOR_SOURCES, paperInk)['--theme-primary-ink-light-color']);
    expect(hex).not.toBe(
      buildPrimaryInkTokens(DEFAULT_COLOR_SOURCES, DEFAULT_PAPER_INK)['--theme-primary-ink-light-color']
    );
  });

  it('is on the runtime allowlist (and so the FOUC script)', () => {
    for (const mode of ['light', 'dark'])
      expect(RUNTIME_COLOR_TOKEN_NAMES, mode).toContain(`--theme-primary-ink-${mode}-color`);
    expect(RUNTIME_COLOR_TOKEN_NAMES).not.toContain('--theme-primary-ink-color');
    expect(foucScript()).toContain('--theme-primary-ink-dark-color');
  });
});

describe('secondary ink (--theme-secondary-ink-{light,dark}-color — secondary small text ≥ 4.5:1)', () => {
  /** Worst ratio of `fg` on every ground text sits on in `mode` (page, secondary, surface, variant). */
  const worstOn = (fg: string, pair: { paper: string; ink: string }, mode: 'light' | 'dark') =>
    Math.min(...textGroundsFor(pair, mode).map((g) => ratio(fg, g)));

  it('a pick writes both modes’ secondary ink, recomputed from the picked secondary', () => {
    const roles = resolveBrandRolesState('#dc4256', { secondary: '#5f9ea0', secondaryLocked: true });
    const pick = buildBrandTokens(roles, 'dark', defaultPaperInk());
    const defaults = buildSecondaryInkTokens(DEFAULT_COLOR_SOURCES, DEFAULT_PAPER_INK);
    for (const mode of ['light', 'dark'] as const) {
      const hex = pick[`--theme-secondary-ink-${mode}-color`]!;
      expect(hex, mode).toMatch(/^#[0-9a-f]{6}$/);
      expect(worstOn(hex, DEFAULT_PAPER_INK[mode], mode), mode).toBeGreaterThanOrEqual(4.5);
      expect(Color.create(hex).h, `${mode} hue`).toBeCloseTo(Color.create(roles.secondary).h, 0);
      expect(hex, `${mode} differs from the default`).not.toBe(defaults[`--theme-secondary-ink-${mode}-color`]);
    }
  });

  it('a pack pick uses the pack’s per-mode secondary', () => {
    const preset = Theme.preset('colorBlue')!;
    const t = buildBrandTokens(brandRolesFromPack('colorBlue', 'light'), 'light', defaultPaperInk(), 'colorBlue');
    const expected = buildSecondaryInkTokens({ secondary: preset.secondary }, DEFAULT_PAPER_INK);
    expect(t['--theme-secondary-ink-light-color']).toBe(expected['--theme-secondary-ink-light-color']);
  });

  it('is recomputed when the paper / ink change (even with the default roles)', () => {
    const paperInk = withPaperInk(defaultPaperInk(), 'dark', { paper: '#3a3040', ink: '#f5f0e6' });
    const map = buildRuntimeColorTokens(defaultBrandRoles('dark'), paperInk, null)!;
    const hex = map['--theme-secondary-ink-dark-color']!;
    expect(worstOn(hex, paperInk.dark, 'dark')).toBeGreaterThanOrEqual(4.5);
    expect(hex).toBe(buildSecondaryInkTokens(DEFAULT_COLOR_SOURCES, paperInk)['--theme-secondary-ink-dark-color']);
    expect(hex).not.toBe(
      buildSecondaryInkTokens(DEFAULT_COLOR_SOURCES, DEFAULT_PAPER_INK)['--theme-secondary-ink-dark-color']
    );
  });

  it('is on the runtime allowlist (and so the FOUC script)', () => {
    for (const mode of ['light', 'dark'])
      expect(RUNTIME_COLOR_TOKEN_NAMES, mode).toContain(`--theme-secondary-ink-${mode}-color`);
    expect(RUNTIME_COLOR_TOKEN_NAMES).not.toContain('--theme-secondary-ink-color');
    expect(foucScript()).toContain('--theme-secondary-ink-dark-color');
  });

  it('the full runtime map still fits the stored-JSON cap', () => {
    const paperInk = withPaperInk(defaultPaperInk(), 'dark', { paper: '#3a3040', ink: '#f5f0e6' });
    const map = buildRuntimeColorTokens(resolveBrandRolesState('#dc4256'), paperInk, null)!;
    expect(JSON.stringify(map).length).toBeLessThan(COLOR_TOKENS_MAX_LENGTH);
  });
});

describe('paper and ink (R-T3a)', () => {
  it('writes both modes’ pairs at once, under the per-mode names', () => {
    const state = withPaperInk(defaultPaperInk(), 'dark', { paper: '#101820', ink: '#f5f0e6' });
    expect(buildPaperInkTokens(state)).toEqual({
      '--theme-paper-light-color': '#f5f0e6',
      '--theme-ink-light-color': '#101820',
      '--theme-paper-dark-color': '#101820',
      '--theme-ink-dark-color': '#f5f0e6',
    });
  });
});

describe('runtime colour map + FOUC (R-T3e)', () => {
  it('is null for the untouched defaults (the stylesheet owns them) and complete otherwise', () => {
    for (const mode of ['light', 'dark'] as const)
      expect(buildRuntimeColorTokens(defaultBrandRoles(mode), defaultPaperInk(), null), mode).toBeNull();
    const map = buildRuntimeColorTokens(resolveBrandRolesState('#dc4256'), defaultPaperInk(), null)!;
    expect(Object.keys(map).sort()).toEqual([...RUNTIME_COLOR_TOKEN_NAMES].sort());
    const paperOnly = buildRuntimeColorTokens(
      defaultBrandRoles('dark'),
      withPaperInk(defaultPaperInk(), 'dark', { paper: '#101820', ink: '#f5f0e6' }),
      null
    );
    expect(paperOnly?.['--theme-paper-dark-color']).toBe('#101820');
  });

  it('sanitises: known --theme-*-color names with #rrggbb values only', () => {
    expect(
      sanitizeColorTokenMap({
        '--theme-primary-light-color': '#AABBCC',
        '--theme-primary-dark-color': 'red',
        '--theme-accent-light-color': '#abc',
        '--theme-secondary-dark-color': '#123456; color: red',
        '--theme-text-color': '#000000',
        '--primary-color': '#000000',
        'background-image': '#000000',
        '--theme-paper-light-color': 42,
      })
    ).toEqual({ '--theme-primary-light-color': '#aabbcc' });
    expect(sanitizeColorTokenMap(null)).toEqual({});
    expect(sanitizeColorTokenMap(['#000000'])).toEqual({});
  });

  it('persists the map, removes it for defaults, and rejects oversized or corrupt storage', () => {
    const storage = memoryStorage();
    const doc = { ...defaultPreferenceDocument(), brandRoles: resolveBrandRolesState('#dc4256') };
    const map = buildRuntimeColorTokens(doc.brandRoles, doc.paperInk, null)!;
    persistPreferenceDocument(storage, doc);
    expect(loadColorTokens(storage)).toEqual(map);
    persistPreferenceDocument(storage, defaultPreferenceDocument());
    expect(storage.values.has(COLOR_TOKENS_KEY)).toBe(false);
    const huge = JSON.stringify({ ...map, pad: 'x'.repeat(COLOR_TOKENS_MAX_LENGTH) });
    expect(loadColorTokens(memoryStorage({ [COLOR_TOKENS_KEY]: huge }))).toEqual({});
    expect(loadColorTokens(memoryStorage({ [COLOR_TOKENS_KEY]: '{nope' }))).toEqual({});
    persistPreferenceDocument(storage, doc);
    resetPreferenceStorage(storage);
    expect(storage.values.has(COLOR_TOKENS_KEY)).toBe(false);
  });

  /** Run the FOUC IIFE against fake storage / document; returns the inline properties it set. */
  function runFouc(stored: Record<string, string>): Record<string, string> {
    const set: Record<string, string> = {};
    const root = {
      style: { setProperty: (k: string, v: string) => void (set[k] = v), colorScheme: '' },
      setAttribute: () => undefined,
      classList: { toggle: () => undefined },
    };
    const run = new Function('localStorage', 'document', 'window', foucScript());
    run(
      { getItem: (k: string) => stored[k] ?? null },
      { documentElement: root },
      { matchMedia: () => ({ matches: true }) }
    );
    return set;
  }

  it('the FOUC script applies the persisted map before paint', () => {
    const map = buildRuntimeColorTokens(resolveBrandRolesState('#dc4256'), defaultPaperInk(), null)!;
    const set = runFouc({ [COLOR_TOKENS_KEY]: JSON.stringify(map) });
    for (const [name, value] of Object.entries(map)) expect(set[name], name).toBe(value);
    // The old runtime names are never written inline any more.
    for (const old of ['--primary-color', '--secondary-color', '--accent-color', '--button-fg', '--paper', '--ink'])
      expect(set[old], old).toBeUndefined();
  });

  it('the FOUC script drops bad names, non-hex values and oversized input', () => {
    const set = runFouc({
      [COLOR_TOKENS_KEY]: JSON.stringify({
        '--theme-primary-light-color': '#123456',
        '--theme-primary-dark-color': 'url(x)',
        '--theme-accent-dark-color': '#12345',
        '--theme-text-color': '#000000',
        '--primary-color': '#000000',
        'x;--a': '#000000',
      }),
    });
    expect(set).toEqual({ '--theme-primary-light-color': '#123456' });
    const map = buildRuntimeColorTokens(resolveBrandRolesState('#dc4256'), defaultPaperInk(), null)!;
    const huge = JSON.stringify({ ...map, pad: 'x'.repeat(COLOR_TOKENS_MAX_LENGTH) });
    expect(runFouc({ [COLOR_TOKENS_KEY]: huge })).toEqual({});
    expect(runFouc({ [COLOR_TOKENS_KEY]: '{nope' })).toEqual({});
  });
});

describe('presets (R-T3f)', () => {
  it('adjust with the theme’s adjustLightnessFor; the local adjustForAa copy is gone', () => {
    const source = readFileSync(join(import.meta.dirname, '../shared/preferences/paint.ts'), 'utf8');
    expect(source).not.toMatch(/function adjustForAa/);
    expect(source).toContain('adjustLightnessFor');
    const preset = Theme.preset('colorRed')!;
    const tokens = buildPresetBackgroundTokens('colorRed', brandRolesFromPack('colorRed', 'dark'), 'dark');
    for (const mode of ['light', 'dark'] as const) {
      const { paper } = DEFAULT_PAPER_INK[mode];
      expect(tokens[`--portfolio-primary-${mode}-color`]).toBe(adjustLightnessFor(preset.primary[mode], paper, 3));
      expect(tokens[`--portfolio-background-accent-${mode}-color`]).toBe(
        adjustLightnessFor(preset.accent[mode], paper, 3)
      );
    }
  });

  it('background roles are the painted brand colours, the same ones the pack tile shows', () => {
    for (const packId of ['brightSkySunset', 'midnightMagic', 'colorYellow']) {
      const tokens = buildPresetBackgroundTokens(packId, brandRolesFromPack(packId, 'dark'), 'dark');
      for (const mode of ['light', 'dark'] as const) {
        const painted = paintedPackColors(packId, mode)!;
        for (const role of ['primary', 'secondary', 'accent'] as const) {
          expect(tokens[`--portfolio-background-${role}-${mode}-color`]).toBe(painted[role]);
          expect(tokens[`--portfolio-${role}-${mode}-color`]).toBe(painted[role]);
        }
      }
    }
  });

  it('every pack paints three distinct colours in both modes', () => {
    for (const pack of BRAND_PACKS) {
      for (const mode of ['light', 'dark'] as const) {
        const { primary, secondary, accent } = paintedPackColors(pack.id, mode)!;
        expect(new Set([primary, secondary, accent].map((c) => c.toLowerCase())).size, `${pack.id} ${mode}`).toBe(3);
      }
    }
  });

  it('every pack image stop stands out from the paper (3:1) and keeps the ink readable (4.5:1)', () => {
    for (const pack of BRAND_PACKS.filter((p) => Theme.preset(p.id)?.background)) {
      const tokens = buildPresetBackgroundTokens(pack.id, brandRolesFromPack(pack.id, 'dark'), 'dark');
      for (const mode of ['light', 'dark'] as const) {
        const { paper, ink } = DEFAULT_PAPER_INK[mode];
        for (const stop of tokens[`--portfolio-background-image-${mode}`]!.match(/#[0-9a-f]{6}/gi)!) {
          expect(ratio(stop, paper), `${pack.id} ${mode} ${stop} on paper`).toBeGreaterThanOrEqual(3);
          expect(ratio(stop, ink), `${pack.id} ${mode} ${stop} under ink`).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  });
});

describe('registry and DOM stay in sync (fix round 1)', () => {
  it('Preferences paint clears runtime names through Theme.remove, never behind its back', () => {
    const paint = readFileSync(join(import.meta.dirname, '../shared/preferences/paint.ts'), 'utf8');
    expect(paint).toContain('Theme.remove');
    expect(paint).not.toMatch(/documentElement\.style\.removeProperty/);
    const composable = readFileSync(join(import.meta.dirname, '../app/composables/usePersonalization.ts'), 'utf8');
    expect(composable).not.toContain('removeTokens(');
    expect(composable).not.toContain('updateTokens');
    // Depth-field chrome may clear `--portfolio-depth-custom-color`; registry colour names must not.
    expect(composable).not.toMatch(/removeProperty\(['`]--theme-/);
    expect(composable).not.toMatch(/removeProperty\(['`]--portfolio-primary/);
  });
});

describe('runtime names are declared by the theme', () => {
  /** Custom properties the compiled theme `:root` (`globals/_root.scss`, both modes) declares. */
  const themeRoot = join(import.meta.dirname, '..', '..', '..', 'theme', 'core');
  const declared = new Set(
    [
      ...sass
        .compile(join(themeRoot, 'scss', 'globals', '_root.scss'), {
          loadPaths: [themeRoot, join(themeRoot, 'scss')],
          style: 'expanded',
          logger: sass.Logger.silent,
        })
        .css.matchAll(/(--[a-zA-Z0-9-]+)\s*:/g),
    ].map((m) => m[1]!)
  );

  it('RUNTIME_COLOR_TOKEN_NAMES ⊆ the names the compiled _root.scss declares (a runtime write always has a default)', () => {
    expect(declared.size).toBeGreaterThan(100);
    expect(RUNTIME_COLOR_TOKEN_NAMES.filter((name) => !declared.has(name))).toEqual([]);
  });
});

describe('status and focus variations follow a custom paper / ink', () => {
  const worstOn = (fg: string, pair: { paper: string; ink: string }, mode: 'light' | 'dark') =>
    Math.min(...textGroundsFor(pair, mode).map((g) => ratio(fg, g)));
  const VARIATIONS = ['light', 'dark', 'light-background', 'dark-background'];
  // The worst custom pairs from the follow-up analysis: status text fell to 3.1–3.6:1 here.
  const cases = [
    { mode: 'dark' as const, pair: { paper: '#2a3814', ink: '#f9fae0' } },
    { mode: 'light' as const, pair: { paper: '#c9c8f6', ink: '#0b0303' } },
    { mode: 'light' as const, pair: { paper: '#aaaaaa', ink: '#000000' } },
  ];

  it('the runtime map rebuilds all eight solid colours (default sources) and the status inks against the pair', () => {
    for (const { mode, pair } of cases) {
      const paperInk = withPaperInk(defaultPaperInk(), mode, pair);
      const map = buildRuntimeColorTokens(defaultBrandRoles(mode), paperInk, null)!;
      const pairs = { light: paperInk.light, dark: paperInk.dark };
      const expected = {
        ...buildColorVariations(DEFAULT_COLOR_SOURCES, pairs),
        ...buildStatusInkTokens(DEFAULT_COLOR_SOURCES, pairs),
      };
      for (const c of SOLID_COLORS)
        for (const v of VARIATIONS) {
          const name = `--theme-${c}-${v}-color`;
          expect(map[name], name).toBe(expected[name]);
        }
      for (const s of STATUS_COLORS) {
        const hex = map[`--theme-${s}-ink-${mode}-color`]!;
        expect(hex, `${s} ${mode}`).toBe(expected[`--theme-${s}-ink-${mode}-color`]);
        expect(worstOn(hex, pair, mode), `${s} ${mode} ${pair.paper}`).toBeGreaterThanOrEqual(4.5);
        expect(ratio(map[`--theme-${s}-${mode}-color`]!, pair.paper), `${s} variation`).toBeGreaterThanOrEqual(4.5);
      }
      expect(worstOn(map[`--theme-focus-${mode}-color`]!, pair, mode), `focus ${mode}`).toBeGreaterThanOrEqual(3);
    }
  });

  it('changes nothing for the default pair: a brand pick writes the status / focus defaults the stylesheet declares', () => {
    const scss = readFileSync(
      join(import.meta.dirname, '../../../theme/core/scss/tokens/_variations.generated.scss'),
      'utf8'
    );
    const map = buildRuntimeColorTokens(resolveBrandRolesState('#dc4256'), defaultPaperInk(), null)!;
    const statusNames = [
      ...['warning', 'error', 'info', 'success', 'focus'].flatMap((c) =>
        VARIATIONS.map((v) => `--theme-${c}-${v}-color`)
      ),
      ...STATUS_COLORS.flatMap((s) => ['light', 'dark'].map((m) => `--theme-${s}-ink-${m}-color`)),
    ];
    for (const name of statusNames) expect(scss, name).toContain(`$${name.slice(2)}: ${map[name]};`);
  });

  it('every per-mode name is on the runtime allowlist (and so the FOUC script); active names are not', () => {
    const fouc = foucScript();
    for (const c of SOLID_COLORS)
      for (const v of VARIATIONS) {
        expect(RUNTIME_COLOR_TOKEN_NAMES).toContain(`--theme-${c}-${v}-color`);
        expect(fouc).toContain(`--theme-${c}-${v}-color`);
      }
    for (const s of STATUS_COLORS)
      for (const m of ['light', 'dark']) {
        expect(RUNTIME_COLOR_TOKEN_NAMES).toContain(`--theme-${s}-ink-${m}-color`);
        expect(fouc).toContain(`--theme-${s}-ink-${m}-color`);
      }
    for (const s of [...STATUS_COLORS, 'focus']) expect(RUNTIME_COLOR_TOKEN_NAMES).not.toContain(`--theme-${s}-color`);
    expect(RUNTIME_COLOR_TOKEN_NAMES).not.toContain('--theme-success-ink-color');
  });
});

describe('hover / active washes follow picks and paper / ink', () => {
  it('a pick on a custom pair writes both modes’ washes, as buildWashTokens makes them for that pick', () => {
    const paperInk = withPaperInk(defaultPaperInk(), 'light', { paper: '#f5f0e6', ink: '#1a1a2e' });
    const map = buildRuntimeColorTokens(resolveBrandRolesState('#dc4256'), paperInk, null)!;
    const pairs = { light: paperInk.light, dark: paperInk.dark };
    const expected = buildWashTokens(map, map, pairs);
    for (const c of ['primary', 'secondary'])
      for (const mode of ['light', 'dark']) {
        const name = `--theme-${c}-wash-${mode}-color`;
        expect(map[name], name).toMatch(/^#[0-9a-f]{6}$/);
        expect(map[name], name).toBe(expected[name]);
        expect(RUNTIME_COLOR_TOKEN_NAMES).toContain(name);
      }
    expect(RUNTIME_COLOR_TOKEN_NAMES).not.toContain('--theme-primary-wash-color');
    expect(JSON.stringify(map).length).toBeLessThan(COLOR_TOKENS_MAX_LENGTH);
  });
});
