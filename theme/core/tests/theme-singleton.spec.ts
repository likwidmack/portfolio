import { afterEach, describe, expect, it } from 'vitest';

import { Theme } from '../src/theme.js';
import { getToken, getTokens, resetTokens } from '../src/token-registry.js';

describe('Theme singleton', () => {
  afterEach(() => {
    resetTokens({ dryRun: true });
  });

  it('lists built-in light/dark and named palettes', () => {
    const names = Theme.list();
    expect(names).toEqual(expect.arrayContaining(['light', 'dark', 'midnightMagic', 'brightSkySunset']));
  });

  it('selects a built-in theme into the registry (dryRun)', () => {
    Theme.select('dark', { dryRun: true });
    expect(getToken('primary-color')).toBe('#ac1922');
    expect(Theme.selected()).toBe('dark');
  });

  it('replaces the full map for light/dark but merges palette accent packs', () => {
    Theme.select('dark', { dryRun: true });
    expect(getToken('--main-background')).toBe('#0f0908');
    Theme.select('midnightMagic', { dryRun: true });
    expect(getToken('--primary-color')).toBe('#3a015c');
    expect(getToken('--button-fg')).toBeTruthy();
    // Surfaces from dark remain after accent-pack merge.
    expect(getToken('--main-background')).toBe('#0f0908');
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
    expect(getToken('--secondary-color')).toBe('#8a6a56');
    Theme.create('primary-only', {
      colors: { primary: '#ff6600' },
    });
    Theme.select('primary-only', { dryRun: true });
    expect(getToken('--primary-color')).toBe('#ff6600');
    expect(getToken('--secondary-color')).toBe('#8a6a56');
    expect(getToken('--button-fg')).toBeTruthy();
  });

  it('full replace drops prior registry keys (dryRun keeps DOM untouched)', () => {
    Theme.update({ '--breakpoint-mobile': '480px' }, { dryRun: true });
    expect(getToken('--breakpoint-mobile')).toBe('480px');
    Theme.select('dark', { dryRun: true });
    expect(getToken('--breakpoint-mobile')).toBeUndefined();
  });

  it('updates ratio and breakpoint tokens without touching document when dryRun', () => {
    Theme.setRatios({ surface: '21 / 9', card: '16 / 9', media: '16 / 9' }, { dryRun: true });
    Theme.setBreakpoints({ current: '1080px' }, { dryRun: true });
    expect(getTokens()['--surface-ratio']).toBe('21 / 9');
    expect(getTokens()['--breakpoint']).toBe('1080px');
  });

  it('throws for unknown theme names', () => {
    expect(() => Theme.select('missing-theme', { dryRun: true })).toThrow(/Unknown theme/);
  });
});
