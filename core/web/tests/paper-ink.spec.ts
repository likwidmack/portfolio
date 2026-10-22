import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createStyleSetup,
  defaultPaperInk,
  isDefaultPaperInk,
  Preferences,
  STYLE_SETUPS_KEY,
  withPaperInk,
  withPaperInkLinked,
} from '../shared/preferences';
import { COLOR_TOKENS_KEY, LEGACY_KEYS } from '../shared/preferences/document';
import { flush, loadDocument } from '../shared/preferences/draft';
import { foucScript } from '../shared/preferences/fouc';
import { readLegacyPreferences } from '../shared/preferences/legacy';
import { buildPaperInkTokens } from '../shared/preferences/paint';
import { setupsApi } from '../shared/preferences/setups';
import {
  defaultPreferenceDocument,
  loadPreferenceDocument,
  persistPreferenceDocument,
  PREFERENCES_KEY,
  resetPreferenceStorage,
} from '../shared/preferences/storage';
import { setPaintForTests } from '../shared/preferences/testing';

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
    // Both modes at once, under the per-mode names (R-T3a); the stylesheet picks the active pair.
    expect(buildPaperInkTokens(state)).toEqual({
      '--theme-paper-light-color': '#faf6f3',
      '--theme-ink-light-color': '#0f0908',
      '--theme-paper-dark-color': '#0f0908',
      '--theme-ink-dark-color': '#faf6f3',
    });
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
    persistPreferenceDocument(storage, defaultPreferenceDocument());
    expect(JSON.parse(storage.values.get(PREFERENCES_KEY)!)).not.toHaveProperty('paperInk');
    const custom = withPaperInk(defaultPaperInk(), 'light', { paper: '#fffdf8', ink: '#1a1a2e' });
    persistPreferenceDocument(storage, { ...defaultPreferenceDocument(), paperInk: custom });
    expect(loadPreferenceDocument(storage).paperInk).toEqual(custom);
    const corrupt = { [PREFERENCES_KEY]: '{"v":1,"paperInk":{"light":{"paper":"red"}}}' };
    expect(loadPreferenceDocument(memoryStorage(corrupt)).paperInk).toEqual(defaultPaperInk());
    expect(readLegacyPreferences(memoryStorage({ [LEGACY_KEYS.paperInk]: '{nope' })).paperInk).toEqual(
      defaultPaperInk()
    );
    resetPreferenceStorage(storage);
    expect(storage.values.has(PREFERENCES_KEY)).toBe(false);
  });

  describe('style setups', () => {
    afterEach(() => {
      flush();
      setPaintForTests(null);
      setupsApi.invalidate();
    });

    it('carry the pair; older setups without one apply the defaults', () => {
      setPaintForTests(vi.fn());
      const custom = withPaperInk(defaultPaperInk(), 'dark', { paper: '#101820', ink: '#f5f0e6' });
      const brandRoles = { primary: '#dc4256', secondary: '#dc8a42', accent: '#42dcc8' };
      const storage = memoryStorage({
        [STYLE_SETUPS_KEY]: JSON.stringify([{ id: 'old', name: 'Old', brandRoles, motion: 'system' }]),
      });
      loadDocument(storage);
      const setup = createStyleSetup('Night', { ...defaultPreferenceDocument(), paperInk: custom });
      setupsApi.save(storage, setup);
      const [legacy, saved] = setupsApi.list(storage);
      expect(saved!.document.paperInk).toEqual(custom);
      expect(Preferences.setups.apply(storage, saved!).paperInk).toEqual(custom);
      expect(loadPreferenceDocument(storage).paperInk).toEqual(custom);
      expect(legacy!.document.paperInk).toEqual(defaultPaperInk());
      expect(Preferences.setups.apply(storage, legacy!).paperInk).toEqual(defaultPaperInk());
      expect(JSON.parse(storage.values.get(PREFERENCES_KEY)!)).not.toHaveProperty('paperInk');
    });
  });

  it('FOUC script applies the persisted variation map (both modes’ pairs), not --paper / --ink', () => {
    const script = foucScript();
    expect(script).toContain(`getItem('${COLOR_TOKENS_KEY}')`);
    expect(script).toContain('--theme-paper-light-color');
    expect(script).toContain('--theme-ink-dark-color');
    expect(script).not.toContain("setProperty('--paper'");
    expect(script).not.toContain("setProperty('--ink'");
  });
});
