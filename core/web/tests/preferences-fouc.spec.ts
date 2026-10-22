import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { foucScript } from '../shared/preferences/fouc';
import { PREFERENCES_MAX_LENGTH } from '../shared/preferences/storage';

function memoryStorage(seed: Record<string, string>): Pick<Storage, 'getItem'> {
  const map = new Map(Object.entries(seed));
  return { getItem: (k) => map.get(k) ?? null };
}

function run(seed: Record<string, string>) {
  // Node's own `localStorage` global shadows jsdom's and is unusable without `--localstorage-file`.
  vi.stubGlobal('localStorage', memoryStorage(seed));
  const root = document.documentElement;
  root.removeAttribute('data-theme');
  root.removeAttribute('data-motion');
  root.removeAttribute('style');
  new Function(foucScript())();
  return root;
}

describe('FOUC script', () => {
  beforeEach(() => {
    window.matchMedia = ((q: string) => ({ matches: false, media: q })) as typeof window.matchMedia;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('applies mode, motion and background options from tgmc-preferences', () => {
    const root = run({
      'tgmc-preferences': JSON.stringify({
        v: 1,
        mode: 'dark',
        motion: 'reduced',
        backgroundOptions: { '--portfolio-background-primary-color': '#112233' },
      }),
    });
    expect(root.dataset.theme).toBe('dark');
    expect(root.dataset.motion).toBe('reduced');
    expect(root.style.getPropertyValue('--portfolio-background-primary-color')).toBe('#112233');
  });

  it('falls back to the legacy keys when tgmc-preferences is absent', () => {
    const root = run({ 'tgmc-theme-mode': 'dark', 'tgmc-motion': 'reduced' });
    expect(root.dataset.theme).toBe('dark');
    expect(root.dataset.motion).toBe('reduced');
  });

  it('ignores an oversized or wrong-version document (no legacy fallback, OS mode)', () => {
    const root = run({ 'tgmc-preferences': JSON.stringify({ v: 2, mode: 'dark' }), 'tgmc-theme-mode': 'dark' });
    expect(root.dataset.theme).toBe('light');
    const oversized = JSON.stringify({ v: 1, mode: 'dark', pad: 'x'.repeat(PREFERENCES_MAX_LENGTH) });
    expect(run({ 'tgmc-preferences': oversized, 'tgmc-theme-mode': 'dark' }).dataset.theme).toBe('light');
    const corrupt = run({ 'tgmc-preferences': '{nope', 'tgmc-theme-mode': 'dark', 'tgmc-motion': 'reduced' });
    expect(corrupt.dataset.theme).toBe('light');
    expect(corrupt.dataset.motion).toBeUndefined();
  });

  it('applies legacy background options only when tgmc-preferences is absent', () => {
    const legacy = { 'tgmc-background-options': JSON.stringify({ '--portfolio-background-primary-color': '#445566' }) };
    expect(run(legacy).style.getPropertyValue('--portfolio-background-primary-color')).toBe('#445566');
    const current = run({ ...legacy, 'tgmc-preferences': JSON.stringify({ v: 1 }) });
    expect(current.style.getPropertyValue('--portfolio-background-primary-color')).toBe('');
  });
});
