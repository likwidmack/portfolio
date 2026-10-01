import { afterEach, describe, expect, it } from 'vitest';

import { buildStudioPresets } from '../src/studio-presets.js';
import { Theme } from '../src/theme.js';
import { getToken, getTokens, resetTokens } from '../src/token-registry.js';
import { colorsLibrary, themeColors } from '../src/tokens.js';

describe('Theme singleton', () => {
  afterEach(() => {
    resetTokens({ dryRun: true });
  });

  it('serves studio presets from theme-presets.json, including extra-swatch fields', () => {
    const built = buildStudioPresets();
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
    expect(getToken('primary-color')).toBe(themeColors.dark.primary);
    expect(Theme.selected()).toBe('dark');
  });

  it('replaces the full map for light/dark but merges palette accent packs', () => {
    Theme.select('dark', { dryRun: true });
    // Five-input model: surfaces / text / borders are derived by the stylesheet from paper / ink,
    // never pinned inline by a built-in mode pack.
    expect(getToken('--main-background')).toBeUndefined();
    expect(getToken('--surface-color')).toBeUndefined();
    expect(getToken('--link-color')).toBe(colorsLibrary.cssVariables.dark['--link-color']);
    const paletteName = Object.keys(colorsLibrary.palettes)[0]!;
    Theme.select(paletteName, { dryRun: true });
    expect(getToken('--primary-color')).toBeTruthy();
    expect(getToken('--button-fg')).toBeTruthy();
    // Non-derived dark tokens remain after the accent-pack merge.
    expect(getToken('--link-color')).toBe(colorsLibrary.cssVariables.dark['--link-color']);
  });

  it('creates and selects a custom theme', () => {
    Theme.create('custom-ember', {
      colors: { primary: '#ff6600', secondary: '#331100' },
      text: { color: '#111111', secondary: '#666666' },
      ratios: { media: '16 / 9' },
    });
    Theme.select('custom-ember', { dryRun: true });
    expect(getToken('--primary-color')).toBe('#ff6600');
    expect(getToken('--button-fg')).toBeTruthy();
    expect(getToken('--text-color')).toBe('#111111');
    expect(getToken('--media-ratio')).toBe('16 / 9');
  });

  it('derives button-fg from registry secondary when custom pack omits secondary', () => {
    Theme.select('dark', { dryRun: true });
    expect(getToken('--secondary-color')).toBe(themeColors.dark.secondary);
    Theme.create('primary-only', {
      colors: { primary: '#ff6600' },
    });
    Theme.select('primary-only', { dryRun: true });
    expect(getToken('--primary-color')).toBe('#ff6600');
    expect(getToken('--secondary-color')).toBe(themeColors.dark.secondary);
    expect(getToken('--button-fg')).toBeTruthy();
  });

  it('full replace drops prior registry keys (dryRun keeps DOM untouched)', () => {
    Theme.update({ '--breakpoint-mobile': '480px' }, { dryRun: true });
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
    expect(light?.['--primary-color']).toBeTruthy();
  });
});
