import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Preferences } from '../shared/preferences';
import { BRAND_PACKS, STYLE_SETUPS_KEY, STYLE_SETUP_ACTIVE_KEY } from '../shared/preferences/document';
import {
  COMMIT_WRITE_DELAY_MS,
  commit,
  flush,
  loadDocument,
  preview,
  resetDocument,
} from '../shared/preferences/draft';
import { convertLegacyStyleSetups } from '../shared/preferences/legacy';
import type { paintDocument } from '../shared/preferences/paint';
import { STYLE_SETUPS_MAX, createStyleSetup, setupsApi } from '../shared/preferences/setups';
import { PREFERENCES_KEY, defaultPreferenceDocument } from '../shared/preferences/storage';
import { setPaintForTests } from '../shared/preferences/testing';

function memoryStorage(seed: Record<string, string> = {}) {
  const map = new Map(Object.entries(seed));
  const storage = {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  } as unknown as Storage;
  return { storage, map };
}

describe('style setups', () => {
  let paint: ReturnType<typeof vi.fn<typeof paintDocument>>;

  beforeEach(() => {
    paint = vi.fn<typeof paintDocument>();
    setPaintForTests(paint);
    setupsApi.invalidate();
  });
  afterEach(() => {
    flush();
    setPaintForTests(null);
    vi.useRealTimers();
  });

  it('a setup stores the full document, including the pack and mode', () => {
    const { storage } = memoryStorage();
    loadDocument(storage);
    const doc = { ...defaultPreferenceDocument(), accent: BRAND_PACKS[0]!.id, mode: 'light' as const };
    const result = setupsApi.save(storage, createStyleSetup('Pack', doc));
    expect(result.ok).toBe(true);
    setupsApi.invalidate();
    const [stored] = setupsApi.list(storage);
    expect(stored!.document.mode).toBe('light');
    expect(stored!.document.accent).toBe(BRAND_PACKS[0]!.id);
  });

  it('stores setups as { v: 1, setups } with compact documents', () => {
    const { storage } = memoryStorage();
    const doc = { ...defaultPreferenceDocument(), motion: 'reduced' as const };
    setupsApi.save(storage, createStyleSetup('  Calm  ', doc, 'calm'));
    expect(JSON.parse(storage.getItem(STYLE_SETUPS_KEY)!)).toEqual({
      v: 1,
      setups: [{ id: 'calm', name: 'Calm', document: { v: 1, motion: 'reduced' } }],
    });
  });

  it('apply commits the setup document and stores it in tgmc-preferences', () => {
    const { storage } = memoryStorage();
    loadDocument(storage);
    const doc = { ...defaultPreferenceDocument(), motion: 'reduced' as const, mode: 'dark' as const };
    setupsApi.save(storage, createStyleSetup('Calm', doc));
    const applied = Preferences.setups.apply(storage, setupsApi.list(storage)[0]!);
    expect(applied).toEqual(doc);
    expect(JSON.parse(storage.getItem(PREFERENCES_KEY)!)).toEqual({ v: 1, mode: 'dark', motion: 'reduced' });
  });

  it('apply marks the setup active, seeds draft + committed and paints once', () => {
    const { storage } = memoryStorage();
    loadDocument(storage);
    const setup = createStyleSetup('Grid', { ...defaultPreferenceDocument(), background: 'grid' }, 'grid');
    setupsApi.save(storage, setup);
    Preferences.setups.apply(storage, setup);
    expect(setupsApi.getActiveId(storage)).toBe('grid');
    expect(paint).toHaveBeenCalledTimes(1);
    expect(paint.mock.calls[0]![0]).toMatchObject({ background: 'grid' });
    expect(preview({}).background).toBe('grid');
  });

  it('refuses a new setup at the limit but allows replacing one', () => {
    const { storage } = memoryStorage();
    loadDocument(storage);
    const doc = defaultPreferenceDocument();
    for (let i = 0; i < STYLE_SETUPS_MAX; i += 1) setupsApi.save(storage, createStyleSetup(`S${i}`, doc, `id-${i}`));
    const extra = setupsApi.save(storage, createStyleSetup('Extra', doc));
    expect(extra).toMatchObject({ ok: false, reason: 'limit' });
    expect(extra.setups).toHaveLength(STYLE_SETUPS_MAX);
    const replaced = setupsApi.save(storage, createStyleSetup('S0 again', doc, 'id-0'));
    expect(replaced.ok).toBe(true);
    expect(replaced.setups[0]!.name).toBe('S0 again');
  });

  it('parses the stored list once until invalidated', () => {
    const { storage } = memoryStorage();
    loadDocument(storage);
    setupsApi.save(storage, createStyleSetup('One', defaultPreferenceDocument()));
    const spy = vi.spyOn(storage, 'getItem');
    setupsApi.list(storage);
    setupsApi.list(storage);
    expect(spy.mock.calls.filter(([k]) => k === STYLE_SETUPS_KEY)).toHaveLength(0);
    setupsApi.invalidate();
    setupsApi.list(storage);
    expect(spy.mock.calls.filter(([k]) => k === STYLE_SETUPS_KEY)).toHaveLength(1);
  });

  it('loadDocument and resetDocument drop the cache', () => {
    const { storage, map } = memoryStorage();
    setupsApi.save(storage, createStyleSetup('One', defaultPreferenceDocument(), 'one'));
    map.set(STYLE_SETUPS_KEY, JSON.stringify({ v: 1, setups: [] }));
    loadDocument(storage);
    expect(setupsApi.list(storage)).toEqual([]);
    setupsApi.save(storage, createStyleSetup('Two', defaultPreferenceDocument(), 'two'));
    resetDocument(storage);
    expect(setupsApi.list(storage)).toEqual([]);
  });

  it('delete clears the active id only when it matched; restore puts the setup back in place', () => {
    const { storage } = memoryStorage();
    const doc = defaultPreferenceDocument();
    const [a, b, c] = ['a', 'b', 'c'].map((id) => createStyleSetup(id.toUpperCase(), doc, id));
    for (const setup of [a, b, c]) setupsApi.save(storage, setup!);
    setupsApi.setActiveId(storage, 'a');
    expect(setupsApi.delete(storage, 'b')).toMatchObject({ clearedActive: false });
    expect(storage.getItem(STYLE_SETUP_ACTIVE_KEY)).toBe('a');
    expect(setupsApi.restore(storage, b!, 1).setups.map((s) => s.id)).toEqual(['a', 'b', 'c']);
    expect(setupsApi.restore(storage, b!, 0).setups.map((s) => s.id)).toEqual(['a', 'b', 'c']);
    const removed = setupsApi.delete(storage, 'a');
    expect(removed.clearedActive).toBe(true);
    expect(removed.setups.map((s) => s.id)).toEqual(['b', 'c']);
    expect(setupsApi.getActiveId(storage)).toBeNull();
  });

  it('restore is refused at the limit and writes nothing', () => {
    const { storage, map } = memoryStorage();
    const doc = defaultPreferenceDocument();
    for (let i = 0; i < STYLE_SETUPS_MAX; i += 1) setupsApi.save(storage, createStyleSetup(`S${i}`, doc, `id-${i}`));
    const [first] = setupsApi.list(storage);
    setupsApi.delete(storage, first!.id);
    setupsApi.save(storage, createStyleSetup('Newcomer', doc, 'new'));
    const stored = map.get(STYLE_SETUPS_KEY);
    const setItem = vi.spyOn(storage, 'setItem');
    const refused = setupsApi.restore(storage, first!, 0);
    expect(refused).toMatchObject({ ok: false, reason: 'limit' });
    expect(refused.setups).toHaveLength(STYLE_SETUPS_MAX);
    expect(setItem).not.toHaveBeenCalled();
    expect(map.get(STYLE_SETUPS_KEY)).toBe(stored);
    setupsApi.delete(storage, 'new');
    const restored = setupsApi.restore(storage, first!, 0);
    expect(restored.ok).toBe(true);
    expect(restored.setups[0]!.id).toBe(first!.id);
    expect(restored.setups).toHaveLength(STYLE_SETUPS_MAX);
  });

  it('restore of an id already in a full list succeeds without a duplicate or a write', () => {
    const { storage } = memoryStorage();
    const doc = defaultPreferenceDocument();
    for (let i = 0; i < STYLE_SETUPS_MAX; i += 1) setupsApi.save(storage, createStyleSetup(`S${i}`, doc, `id-${i}`));
    const setItem = vi.spyOn(storage, 'setItem');
    const result = setupsApi.restore(storage, createStyleSetup('S3', doc, 'id-3'), 0);
    expect(result.ok).toBe(true);
    expect(result.setups).toHaveLength(STYLE_SETUPS_MAX);
    expect(result.setups.filter((s) => s.id === 'id-3')).toHaveLength(1);
    expect(setItem).not.toHaveBeenCalled();
  });

  it('Preferences.setups.restore refuses at the limit too', () => {
    const { storage } = memoryStorage();
    loadDocument(storage);
    const doc = defaultPreferenceDocument();
    for (let i = 0; i < STYLE_SETUPS_MAX; i += 1) setupsApi.save(storage, createStyleSetup(`S${i}`, doc, `id-${i}`));
    expect(Preferences.setups.restore(storage, createStyleSetup('Gone', doc, 'gone'), 0)).toMatchObject({
      ok: false,
      reason: 'limit',
    });
  });

  it('Preferences.setups save / delete / restore flush a pending commit write first', () => {
    vi.useFakeTimers();
    const { storage } = memoryStorage();
    loadDocument(storage);
    const one = createStyleSetup('One', defaultPreferenceDocument(), 'one');
    const steps = [
      ['playful', () => Preferences.setups.save(storage, one)],
      ['reduced', () => Preferences.setups.delete(storage, 'one')],
      ['playful', () => Preferences.setups.restore(storage, one, 0)],
    ] as const;
    for (const [motion, step] of steps) {
      preview({ motion });
      commit(storage);
      step();
      expect(JSON.parse(storage.getItem(PREFERENCES_KEY)!).motion).toBe(motion);
    }
    vi.advanceTimersByTime(COMMIT_WRITE_DELAY_MS);
  });

  it('ignores unknown versions and invalid entries', () => {
    const { storage, map } = memoryStorage();
    map.set(STYLE_SETUPS_KEY, JSON.stringify({ v: 2, setups: [{ id: 'a', name: 'A', document: { v: 1 } }] }));
    expect(setupsApi.list(storage)).toEqual([]);
    setupsApi.invalidate();
    map.set(
      STYLE_SETUPS_KEY,
      JSON.stringify({
        v: 1,
        setups: [
          { id: '', name: 'A', document: {} },
          { id: 'b', name: 'B', document: { v: 1 } },
        ],
      })
    );
    expect(setupsApi.list(storage).map((s) => s.id)).toEqual(['b']);
    setupsApi.invalidate();
    map.set(STYLE_SETUPS_KEY, '{not json');
    expect(setupsApi.list(storage)).toEqual([]);
  });

  it('converts the old array shape (no pack → null, no mode → current mode)', () => {
    const { storage } = memoryStorage({
      [STYLE_SETUPS_KEY]: JSON.stringify([
        { id: 'a', name: 'Old', brandRoles: { primary: '#1f6feb' }, motion: 'reduced', background: 'grid' },
      ]),
    });
    expect(convertLegacyStyleSetups(storage, 'light')).toBe(true);
    const [setup] = setupsApi.list(storage);
    expect(setup!.document).toMatchObject({ mode: 'light', accent: null, motion: 'reduced', background: 'grid' });
    expect(setup!.document.brandRoles.primary).toBe('#1f6feb');
  });

  it('legacy conversion keeps a stored mode, renames old background-option keys and drops invalid setups', () => {
    const { storage } = memoryStorage({
      [STYLE_SETUPS_KEY]: JSON.stringify([
        {
          id: 'a',
          name: 'Old',
          mode: 'dark',
          brandRoles: { primary: '#1f6feb' },
          backgroundOptions: { '--portfolio-background-primary': '#112233' },
        },
        { id: 'b', name: 'No roles' },
      ]),
    });
    expect(convertLegacyStyleSetups(storage, 'light')).toBe(true);
    const stored = JSON.parse(storage.getItem(STYLE_SETUPS_KEY)!);
    expect(stored.v).toBe(1);
    expect(stored.setups).toHaveLength(1);
    expect(stored.setups[0].document.backgroundOptions).toEqual({ '--portfolio-background-primary-color': '#112233' });
    expect(setupsApi.list(storage)[0]!.document.mode).toBe('dark');
    expect(convertLegacyStyleSetups(storage, 'light')).toBe(false);
  });

  it('loadDocument converts old setups using the loaded mode', () => {
    const { storage } = memoryStorage({
      [PREFERENCES_KEY]: JSON.stringify({ v: 1, mode: 'dark' }),
      [STYLE_SETUPS_KEY]: JSON.stringify([{ id: 'a', name: 'Old', brandRoles: { primary: '#1f6feb' } }]),
    });
    loadDocument(storage);
    expect(JSON.parse(storage.getItem(STYLE_SETUPS_KEY)!).v).toBe(1);
    expect(setupsApi.list(storage)[0]!.document.mode).toBe('dark');
  });

  it('a failed setups write leaves the cached list unchanged', () => {
    const { storage, map } = memoryStorage();
    setupsApi.save(storage, createStyleSetup('One', defaultPreferenceDocument(), 'one'));
    const failing = {
      ...storage,
      getItem: (k: string) => map.get(k) ?? null,
      removeItem: (k: string) => void map.delete(k),
      setItem: (k: string, v: string) => {
        if (k === STYLE_SETUPS_KEY) throw new DOMException('full', 'QuotaExceededError');
        map.set(k, v);
      },
    } as unknown as Storage;
    expect(() => setupsApi.save(failing, createStyleSetup('Two', defaultPreferenceDocument(), 'two'))).toThrow(
      DOMException
    );
    expect(() => setupsApi.delete(failing, 'one')).toThrow(DOMException);
    expect(setupsApi.list(storage).map((s) => s.id)).toEqual(['one']);
  });

  it('caller mutation after save / restore does not change the cached setups', () => {
    const { storage } = memoryStorage();
    const saved = createStyleSetup('One', defaultPreferenceDocument(), 'one');
    setupsApi.save(storage, saved);
    saved.name = 'Mutated';
    saved.document.motion = 'reduced';
    const restored = createStyleSetup('Two', defaultPreferenceDocument(), 'two');
    setupsApi.restore(storage, restored, 0);
    restored.document.background = 'grid';
    const [two, one] = setupsApi.list(storage);
    expect(one).toMatchObject({ name: 'One', document: { motion: 'system' } });
    expect(two!.document.background).toBe('particles');
  });

  it('delete with an unknown id does not rewrite storage', () => {
    const { storage } = memoryStorage();
    setupsApi.save(storage, createStyleSetup('One', defaultPreferenceDocument(), 'one'));
    setupsApi.setActiveId(storage, 'one');
    const setItem = vi.spyOn(storage, 'setItem');
    const removeItem = vi.spyOn(storage, 'removeItem');
    expect(setupsApi.delete(storage, 'missing')).toEqual({ setups: setupsApi.list(storage), clearedActive: false });
    expect(setItem).not.toHaveBeenCalled();
    expect(removeItem).not.toHaveBeenCalled();
  });

  it('legacy conversion keeps more than 24 setups; new saves are refused until under the limit', () => {
    const legacy = Array.from({ length: STYLE_SETUPS_MAX + 2 }, (_, i) => ({
      id: `old-${i}`,
      name: `Old ${i}`,
      brandRoles: { primary: '#1f6feb' },
    }));
    const { storage } = memoryStorage({ [STYLE_SETUPS_KEY]: JSON.stringify(legacy) });
    convertLegacyStyleSetups(storage, 'dark');
    expect(setupsApi.list(storage)).toHaveLength(STYLE_SETUPS_MAX + 2);
    const doc = defaultPreferenceDocument();
    expect(setupsApi.save(storage, createStyleSetup('New', doc))).toMatchObject({ ok: false, reason: 'limit' });
    expect(setupsApi.save(storage, createStyleSetup('Renamed', doc, 'old-0')).ok).toBe(true);
    for (const id of ['old-1', 'old-2']) setupsApi.delete(storage, id);
    expect(setupsApi.save(storage, createStyleSetup('Still full', doc)).ok).toBe(false);
    setupsApi.delete(storage, 'old-3');
    expect(setupsApi.save(storage, createStyleSetup('Fits', doc)).ok).toBe(true);
  });

  describe('an old array written after load (old-bundle tab)', () => {
    const oldArray = (...ids: string[]) =>
      JSON.stringify(ids.map((id) => ({ id, name: `Old ${id}`, brandRoles: { primary: '#1f6feb' } })));

    it('reload converts it and lists the converted setups', () => {
      const { storage, map } = memoryStorage({ [PREFERENCES_KEY]: JSON.stringify({ v: 1, mode: 'light' }) });
      loadDocument(storage);
      Preferences.setups.save(storage, createStyleSetup('New', defaultPreferenceDocument(), 'new'));
      map.set(STYLE_SETUPS_KEY, oldArray('a', 'b'));
      const listed = Preferences.setups.reload(storage);
      expect(listed.map((s) => s.id)).toEqual(['a', 'b']);
      expect(listed[0]!.document.mode).toBe('light');
      expect(JSON.parse(map.get(STYLE_SETUPS_KEY)!).v).toBe(1);
    });

    it('save after reload keeps the old setups and adds the new one', () => {
      const { storage, map } = memoryStorage();
      loadDocument(storage);
      map.set(STYLE_SETUPS_KEY, oldArray('a', 'b'));
      Preferences.setups.reload(storage);
      const result = Preferences.setups.save(storage, createStyleSetup('New', defaultPreferenceDocument(), 'new'));
      expect(result.setups.map((s) => s.id)).toEqual(['a', 'b', 'new']);
      const stored = JSON.parse(map.get(STYLE_SETUPS_KEY)!);
      expect(stored.v).toBe(1);
      expect(stored.setups.map((s: { id: string }) => s.id)).toEqual(['a', 'b', 'new']);
    });

    it('save, delete and restore convert an unconverted array before writing (never overwrite it)', () => {
      const { storage, map } = memoryStorage();
      loadDocument(storage);
      Preferences.setups.list(storage);
      map.set(STYLE_SETUPS_KEY, oldArray('a', 'b'));
      const saved = Preferences.setups.save(storage, createStyleSetup('New', defaultPreferenceDocument(), 'new'));
      expect(saved.setups.map((s) => s.id)).toEqual(['a', 'b', 'new']);

      map.set(STYLE_SETUPS_KEY, oldArray('a', 'b', 'c'));
      expect(Preferences.setups.delete(storage, 'b').setups.map((s) => s.id)).toEqual(['a', 'c']);

      map.set(STYLE_SETUPS_KEY, oldArray('a', 'c'));
      const restored = Preferences.setups.restore(storage, createStyleSetup('B', defaultPreferenceDocument(), 'b'), 1);
      expect(restored.setups.map((s) => s.id)).toEqual(['a', 'b', 'c']);
      expect(JSON.parse(map.get(STYLE_SETUPS_KEY)!).setups).toHaveLength(3);
    });
  });
});
