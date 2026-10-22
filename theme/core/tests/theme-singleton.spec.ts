import { afterEach, describe, expect, it } from 'vitest';

import { buildStudioPresets } from '../src/studio-presets.js';
import { Theme } from '../src/theme.js';
import { getToken, getTokens, resetTokens } from '../src/token-registry.js';
import { colorsLibrary } from '../src/tokens.js';

describe('Theme singleton', () => {
  afterEach(() => {
    resetTokens({ dryRun: true });
  });

  it('serves studio presets from theme-presets.json, including extra-swatch fields', () => {
    const built = buildStudioPresets();
    // Drift → regenerate: `npm run build:presets --workspace=@tgmc/theme` (bin/build-theme-presets.mjs).
    expect(Theme.presets()).toEqual(built);
    expect(built.length).toBeGreaterThan(0);
    const night = built.find((preset) => preset.id === 'darkNightGoldenDay') ?? built[0]!;
    expect(Theme.preset(night.id)?.swatches.length).toBeGreaterThan(3);
    expect(Theme.preset(night.id)?.background?.image).toContain('radial-gradient');
    expect(Theme.preset(night.id)?.background?.clip).toBeTruthy();
    const red = built.find((preset) => preset.kind === 'color') ?? built.find((preset) => preset.id === 'colorRed');
    expect(red).toBeTruthy();
    if (!red) return;
    expect(Theme.preset(red.id)?.kind).toBe('color');
    expect(Theme.preset(red.id)?.background).toBeNull();
    expect(Theme.preset(red.id)?.backgroundRoles.primary.dark.toLowerCase()).toBe(
      Theme.preset(red.id)?.primary.dark.toLowerCase()
    );
    expect(Theme.preset(red.id)?.backgroundRoles.secondary.dark.toLowerCase()).not.toBe(
      Theme.preset(red.id)?.primary.dark.toLowerCase()
    );
    expect(Theme.preset(red.id)?.secondary.dark.toLowerCase()).not.toBe(
      Theme.preset(red.id)?.primary.dark.toLowerCase()
    );
    expect(Theme.preset(red.id)?.accent.dark.toLowerCase()).not.toBe(Theme.preset(red.id)?.primary.dark.toLowerCase());
    expect(Theme.preset('missing')).toBeUndefined();
  });

  it('lists built-in light/dark and named palettes', () => {
    const names = Theme.list();
    expect(names).toEqual(expect.arrayContaining(['light', 'dark', ...Object.keys(colorsLibrary.palettes)]));
  });

  it('selects a built-in theme into the registry (dryRun)', () => {
    Theme.select('dark', { dryRun: true });
    // R-T3d: a built-in mode pack pins no colour — the stylesheet switches every colour per mode.
    expect(getToken('theme-primary-color')).toBeUndefined();
    expect(getToken('--border-radius-md')).toBeTruthy();
    expect(Theme.selected()).toBe('dark');
  });

  it('replaces the full map for light/dark but merges palette accent packs', () => {
    Theme.select('dark', { dryRun: true });
    // Five-input model: surfaces / text / borders are derived by the stylesheet from paper / ink,
    // never pinned inline by a built-in mode pack.
    expect(getToken('--theme-main-background-color')).toBeUndefined();
    expect(getToken('--theme-surface-color')).toBeUndefined();
    // R-T3d: no mode colour either (the stylesheet owns --theme-link-color per mode).
    expect(getToken('--theme-link-color')).toBeUndefined();
    const paletteName = Object.keys(colorsLibrary.palettes)[0]!;
    Theme.select(paletteName, { dryRun: true });
    expect(getToken('--theme-primary-color')).toBeTruthy();
    expect(getToken('--theme-button-fg-color')).toBeTruthy();
    // Non-colour dark tokens remain after the accent-pack merge.
    expect(getToken('--border-radius-md')).toBeTruthy();
  });

  it('creates and selects a custom theme', () => {
    Theme.create('custom-ember', {
      colors: { primary: '#ff6600', secondary: '#331100' },
      text: { color: '#111111', secondary: '#666666' },
      ratios: { media: '16 / 9' },
    });
    Theme.select('custom-ember', { dryRun: true });
    expect(getToken('--theme-primary-color')).toBe('#ff6600');
    expect(getToken('--theme-button-fg-color')).toBeTruthy();
    expect(getToken('--theme-text-color')).toBe('#111111');
    expect(getToken('--media-ratio')).toBe('16 / 9');
  });

  it('writes a pack surface / background / text colours under their --theme-…-color names only', () => {
    // The status inks / surfaces derive from --theme-surface-color / --theme-text-color, so a pack
    // sets the new names for its surface and text to tint them; the old names are gone (Task 8).
    const tokens = Theme.create('surface-text-pack', {
      colors: { surface: '#202020', surfaceVariant: '#303030', background: '#101010' },
      text: { color: '#eeeeee', secondary: '#bbbbbb' },
    });
    const expected = {
      '--theme-surface-color': '#202020',
      '--theme-surface-variant-color': '#303030',
      '--theme-main-background-color': '#101010',
      '--theme-text-color': '#eeeeee',
      '--theme-text-secondary-color': '#bbbbbb',
    };
    expect(tokens).toEqual(expected);
    Theme.select('surface-text-pack', { dryRun: true });
    for (const [key, value] of Object.entries(expected)) expect(getToken(key), key).toBe(value);
    // A pack is the raw path: its brand / paper picks go out under the active new names (R-T3d).
    const brand = Theme.create('brand-pack', { colors: { primary: '#ff6600', paper: '#fffdf8' } });
    expect(brand['--theme-primary-color']).toBe('#ff6600');
    expect(brand['--theme-paper-color']).toBe('#fffdf8');
    expect(brand['--primary-color']).toBeUndefined();
    expect(brand['--paper']).toBeUndefined();
  });

  it('setText writes the text colours under their new names', () => {
    Theme.setText({ color: '#121212', secondary: '#5a5a5a' }, { dryRun: true });
    expect(getTokens()['--text-color']).toBeUndefined();
    expect(getToken('--theme-text-color')).toBe('#121212');
    expect(getToken('--theme-text-secondary-color')).toBe('#5a5a5a');
  });

  it('derives button-fg when a custom pack omits secondary, without pinning a secondary', () => {
    Theme.select('dark', { dryRun: true });
    // R-T3d: the built-in pack pins no secondary, so the pack falls back to primary.
    expect(getToken('--theme-secondary-color')).toBeUndefined();
    Theme.create('primary-only', {
      colors: { primary: '#ff6600' },
    });
    Theme.select('primary-only', { dryRun: true });
    expect(getToken('--theme-primary-color')).toBe('#ff6600');
    expect(getToken('--theme-secondary-color')).toBeUndefined();
    expect(getToken('--theme-button-fg-color')).toBeTruthy();
  });

  it('full replace drops prior registry keys (dryRun keeps DOM untouched)', () => {
    Theme.apply({ '--breakpoint-mobile': '480px' }, { dryRun: true });
    expect(getToken('--breakpoint-mobile')).toBe('480px');
    Theme.select('dark', { dryRun: true });
    expect(getToken('--breakpoint-mobile')).toBeUndefined();
  });

  it('updates ratio and breakpoint tokens without touching document when dryRun', () => {
    Theme.setRatios({ surface: '16 / 9', card: '16 / 9', media: '16 / 9' }, { dryRun: true });
    Theme.setBreakpoints({ current: '1080px' }, { dryRun: true });
    expect(getTokens()['--surface-ratio']).toBe('16 / 9');
    expect(getTokens()['--breakpoint']).toBe('1080px');
  });

  it('throws for unknown theme names', () => {
    expect(() => Theme.select('missing-theme', { dryRun: true })).toThrow(/Unknown theme/);
  });

  it('returns undefined for Theme.get of an unknown name without throwing', () => {
    expect(Theme.get('missing-theme')).toBeUndefined();
  });

  it('snapshots a built-in theme via Theme.get', () => {
    const light = Theme.get('light');
    expect(light).toBeTruthy();
    expect(light?.['--border-radius-md']).toBeTruthy();
    expect(light?.['--theme-primary-color']).toBeUndefined();
    // The only colour a mode pack pins is the palette name the stylesheet does not switch.
    expect(Object.keys(light ?? {}).sort()).toEqual(['--border-radius-md', '--primary-default']);
  });
});
