import { describe, expect, it } from 'vitest';

import {
  applyStyleSetup,
  buildPaperInkTokens,
  buildPersonalizationFoucScript,
  defaultPaperInk,
  isDefaultPaperInk,
  loadPaperInk,
  loadPersonalization,
  PAPER_INK_KEY,
  persistPaperInk,
  resetPersonalization,
  snapshotFromLive,
  upsertStyleSetup,
  withPaperInk,
  withPaperInkLinked,
} from '../shared/personalization';

function memoryStorage(seed: Record<string, string> = {}) {
  const values = new Map(Object.entries(seed));
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
    removeItem: (key: string) => void values.delete(key),
  };
}

describe('pen & paper personalization', () => {
  it('defaults: paper is the background and ink the foreground; dark mode is the inverse pair', () => {
    const state = defaultPaperInk();
    expect(state.linked).toBe(true);
    expect(state.dark).toEqual({ paper: state.light.ink, ink: state.light.paper });
    expect(buildPaperInkTokens(state, 'light')).toEqual({ '--paper': '#faf6f3', '--ink': '#0f0908' });
    expect(buildPaperInkTokens(state, 'dark')).toEqual({ '--paper': '#0f0908', '--ink': '#faf6f3' });
    expect(isDefaultPaperInk(state)).toBe(true);
  });

  it('linked: editing one mode sets the other to the inverse', () => {
    const next = withPaperInk(defaultPaperInk(), 'dark', { paper: '#101820', ink: '#F5F0E6' });
    expect(next.dark).toEqual({ paper: '#101820', ink: '#f5f0e6' });
    expect(next.light).toEqual({ paper: '#f5f0e6', ink: '#101820' });
  });

  it('unlinked: modes keep independent pairs; re-linking re-derives from the edited mode', () => {
    let state = withPaperInkLinked(defaultPaperInk(), false, 'dark');
    state = withPaperInk(state, 'dark', { paper: '#000000', ink: '#ffffff' });
    expect(state.light).toEqual(defaultPaperInk().light);
    state = withPaperInkLinked(state, true, 'dark');
    expect(state.light).toEqual({ paper: '#ffffff', ink: '#000000' });
  });

  it('persists only non-defaults and survives corrupt storage', () => {
    const storage = memoryStorage();
    persistPaperInk(storage, defaultPaperInk());
    expect(storage.values.has(PAPER_INK_KEY)).toBe(false);
    const custom = withPaperInk(defaultPaperInk(), 'light', { paper: '#fffdf8', ink: '#1a1a2e' });
    persistPaperInk(storage, custom);
    expect(loadPaperInk(storage)).toEqual(custom);
    expect(loadPersonalization(storage).paperInk).toEqual(custom);
    expect(loadPaperInk(memoryStorage({ [PAPER_INK_KEY]: '{nope' }))).toEqual(defaultPaperInk());
    expect(loadPaperInk(memoryStorage({ [PAPER_INK_KEY]: '{"light":{"paper":"red"}}' }))).toEqual(defaultPaperInk());
    resetPersonalization(storage);
    expect(storage.values.has(PAPER_INK_KEY)).toBe(false);
  });

  it('style setups carry the pair; older setups without one apply the defaults', () => {
    const custom = withPaperInk(defaultPaperInk(), 'dark', { paper: '#101820', ink: '#f5f0e6' });
    const base = {
      name: 'Night',
      brandRoles: { primary: '#dc4256', secondary: '#dc8a42', accent: '#42dcc8' },
      motion: 'system' as const,
      background: 'particles' as const,
    };
    const setup = snapshotFromLive({ ...base, paperInk: custom });
    expect(upsertStyleSetup([], setup)[0]!.paperInk).toEqual(custom);
    const storage = memoryStorage();
    expect(applyStyleSetup(storage, setup).paperInk).toEqual(custom);
    expect(JSON.parse(storage.values.get(PAPER_INK_KEY)!)).toEqual(custom);
    const legacy = snapshotFromLive(base);
    expect(legacy.paperInk).toBeUndefined();
    expect(applyStyleSetup(storage, legacy).paperInk).toEqual(defaultPaperInk());
    expect(storage.values.has(PAPER_INK_KEY)).toBe(false);
  });

  it('FOUC script applies the resolved mode pair before paint', () => {
    const script = buildPersonalizationFoucScript();
    expect(script).toContain(`localStorage.getItem('${PAPER_INK_KEY}')`);
    expect(script).toContain("r.style.setProperty('--paper',pp.paper)");
    expect(script).toContain("r.style.setProperty('--ink',pp.ink)");
  });
});
