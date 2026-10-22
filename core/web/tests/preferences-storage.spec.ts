import { afterEach, describe, expect, it } from 'vitest';

import { Preferences } from '../shared/preferences';
import {
  BRAND_PACKS,
  brandRolesFromPack,
  COLOR_TOKENS_KEY,
  defaultPaperInk,
  parsePaperInk,
  STYLE_SETUPS_KEY,
  withPaperInk,
} from '../shared/preferences/document';
import { loadDocument } from '../shared/preferences/draft';
import { convertLegacyPreferences } from '../shared/preferences/legacy';
import { buildRuntimeColorTokens, RUNTIME_COLOR_TOKEN_NAMES } from '../shared/preferences/paint';
import { setupsApi } from '../shared/preferences/setups';
import {
  defaultPreferenceDocument,
  loadPreferenceDocument,
  parsePreferenceDocument,
  persistPreferenceDocument,
  PREFERENCE_KEYS,
  PREFERENCES_KEY,
  PREFERENCES_MAX_LENGTH,
  refreshStaleColorTokens,
  resetPreferenceStorage,
  serializePreferenceDocument,
} from '../shared/preferences/storage';

function memoryStorage(seed: Record<string, string> = {}) {
  const map = new Map(Object.entries(seed));
  const writes: string[] = [];
  const storage = {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => {
      writes.push(k);
      map.set(k, v);
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    key: (i: number) => [...map.keys()][i] ?? null,
  } as Storage;
  return { storage, map, writes };
}

describe('preference document codec', () => {
  it('round-trips and omits defaults', () => {
    const doc = { ...defaultPreferenceDocument(), mode: 'light' as const, motion: 'reduced' as const };
    const json = serializePreferenceDocument(doc);
    expect(JSON.parse(json)).toEqual({ v: 1, mode: 'light', motion: 'reduced' });
    expect(parsePreferenceDocument(JSON.parse(json))).toEqual(doc);
  });

  it('serialises the default document as just the version', () => {
    expect(serializePreferenceDocument(defaultPreferenceDocument())).toBe('{"v":1}');
  });

  it('falls back per field and on wrong version', () => {
    const base = defaultPreferenceDocument();
    expect(parsePreferenceDocument({ v: 1, mode: 'sepia', motion: 'reduced' })).toEqual({ ...base, motion: 'reduced' });
    expect(parsePreferenceDocument({ v: 2, motion: 'reduced' })).toEqual(base);
    expect(parsePreferenceDocument('nope')).toEqual(base);
  });

  it('ignores oversized and corrupt stored values', () => {
    const padded = (length: number) => {
      const head = '{"v":1,"motion":"reduced","pad":"';
      return `${head}${'x'.repeat(length - head.length - 2)}"}`;
    };
    const over = padded(PREFERENCES_MAX_LENGTH + 1);
    const under = padded(PREFERENCES_MAX_LENGTH - 1);
    expect(over.length).toBeGreaterThan(PREFERENCES_MAX_LENGTH);
    expect(under.length).toBeLessThan(PREFERENCES_MAX_LENGTH);
    expect(loadPreferenceDocument(memoryStorage({ [PREFERENCES_KEY]: over }).storage)).toEqual(
      defaultPreferenceDocument()
    );
    expect(loadPreferenceDocument(memoryStorage({ [PREFERENCES_KEY]: under }).storage).motion).toBe('reduced');
    const bad = memoryStorage({ [PREFERENCES_KEY]: '{not json' });
    expect(loadPreferenceDocument(bad.storage)).toEqual(defaultPreferenceDocument());
  });
});

describe('persistPreferenceDocument', () => {
  it('skips identical writes and writes the colour map only when it changes', () => {
    const { storage, writes } = memoryStorage();
    const doc = { ...defaultPreferenceDocument(), mode: 'dark' as const };
    persistPreferenceDocument(storage, doc);
    persistPreferenceDocument(storage, doc);
    expect(writes).toEqual([PREFERENCES_KEY]);

    const custom = { ...doc, brandRoles: { ...doc.brandRoles, primary: '#1f6feb' } };
    persistPreferenceDocument(storage, custom);
    persistPreferenceDocument(storage, custom);
    expect(writes.filter((k) => k === COLOR_TOKENS_KEY)).toHaveLength(1);
  });

  it('removes the colour map when returning to defaults', () => {
    const { storage, map } = memoryStorage({ [COLOR_TOKENS_KEY]: '{"--theme-primary-light-color":"#123456"}' });
    persistPreferenceDocument(storage, defaultPreferenceDocument());
    expect(map.has(COLOR_TOKENS_KEY)).toBe(false);
  });

  it.each([PREFERENCES_KEY, COLOR_TOKENS_KEY])('a failed %s write restores both keys, then rethrows', (failing) => {
    const before = { ...defaultPreferenceDocument(), motion: 'reduced' as const };
    const seeded = memoryStorage();
    persistPreferenceDocument(seeded.storage, {
      ...before,
      brandRoles: brandRolesFromPack(BRAND_PACKS[0]!.id, 'dark'),
    });
    const previous = Object.fromEntries(seeded.map);
    expect(Object.keys(previous).sort()).toEqual([COLOR_TOKENS_KEY, PREFERENCES_KEY].sort());

    const { storage, map } = memoryStorage(previous);
    const setItem = storage.setItem;
    storage.setItem = (k: string, v: string) => {
      if (k === failing && v !== previous[k]) throw new DOMException('full', 'QuotaExceededError');
      setItem(k, v);
    };
    const next = { ...before, motion: 'playful' as const, brandRoles: brandRolesFromPack('colorRed', 'dark') };
    expect(() => persistPreferenceDocument(storage, next)).toThrow(DOMException);
    expect(map.get(PREFERENCES_KEY)).toBe(previous[PREFERENCES_KEY]);
    expect(map.get(COLOR_TOKENS_KEY)).toBe(previous[COLOR_TOKENS_KEY]);
  });

  it('a failed write removes a key that did not exist before', () => {
    const { storage, map } = memoryStorage();
    const setItem = storage.setItem;
    storage.setItem = (k: string, v: string) => {
      if (k === PREFERENCES_KEY) throw new DOMException('full', 'QuotaExceededError');
      setItem(k, v);
    };
    const doc = { ...defaultPreferenceDocument(), brandRoles: brandRolesFromPack('colorRed', 'dark') };
    expect(() => persistPreferenceDocument(storage, doc)).toThrow(DOMException);
    expect(map.size).toBe(0);
  });
});

describe('legacy conversion', () => {
  it('builds tgmc-preferences from the old keys, writes the map, removes the old keys', () => {
    const { storage, map } = memoryStorage({
      'tgmc-theme-mode': 'light',
      'tgmc-motion': 'reduced',
      'tgmc-background': 'grid',
      'tgmc-brand-roles': JSON.stringify({ primary: '#1f6feb' }),
      'tgmc-background-options': JSON.stringify({ '--portfolio-background-primary': '#112233' }),
    });
    expect(convertLegacyPreferences(storage)).not.toBeNull();
    const doc = loadPreferenceDocument(storage);
    expect(doc.mode).toBe('light');
    expect(doc.motion).toBe('reduced');
    expect(doc.background).toBe('grid');
    expect(doc.brandRoles.primary).toBe('#1f6feb');
    expect(doc.backgroundOptions['--portfolio-background-primary-color']).toBe('#112233');
    expect(map.has(COLOR_TOKENS_KEY)).toBe(true);
    for (const key of PREFERENCE_KEYS.legacy) expect(map.has(key)).toBe(false);
  });

  it('converts tgmc-accent alone into that pack and its brand roles', () => {
    const pack = BRAND_PACKS[0]!.id;
    const { storage, map } = memoryStorage({ 'tgmc-accent': pack });
    expect(convertLegacyPreferences(storage)).not.toBeNull();
    const doc = loadPreferenceDocument(storage);
    expect(doc.accent).toBe(pack);
    expect(doc.brandRoles).toEqual(brandRolesFromPack(pack, 'dark'));
    expect(map.has(COLOR_TOKENS_KEY)).toBe(true);
    expect(map.has('tgmc-accent')).toBe(false);
  });

  it('converts tgmc-paper-ink into the document and the colour map', () => {
    const paperInk = withPaperInk(defaultPaperInk(), 'dark', { paper: '#101820', ink: '#f0e8d8' });
    const { storage, map } = memoryStorage({ 'tgmc-paper-ink': JSON.stringify(paperInk) });
    expect(convertLegacyPreferences(storage)).not.toBeNull();
    expect(loadPreferenceDocument(storage).paperInk).toEqual(paperInk);
    expect(JSON.parse(map.get(COLOR_TOKENS_KEY)!)).toMatchObject({ '--theme-paper-dark-color': '#101820' });
    expect(map.has('tgmc-paper-ink')).toBe(false);
  });

  it('is a no-op when no legacy key is present', () => {
    const { storage, writes } = memoryStorage();
    expect(convertLegacyPreferences(storage)).toBeNull();
    expect(writes).toEqual([]);
  });

  it('when tgmc-preferences exists, removes leftover legacy keys without converting them (new key wins)', () => {
    const stored = JSON.stringify({ v: 1, motion: 'playful' });
    const { storage, map, writes } = memoryStorage({
      [PREFERENCES_KEY]: stored,
      'tgmc-motion': 'reduced',
      'tgmc-theme-mode': 'light',
    });
    expect(convertLegacyPreferences(storage)).toBeNull();
    for (const key of PREFERENCE_KEYS.legacy) expect(map.has(key)).toBe(false);
    expect(map.get(PREFERENCES_KEY)).toBe(stored);
    expect(writes).toEqual([]);
  });

  it('loadDocument removes legacy keys rewritten after conversion and keeps the new document', () => {
    const { storage, map } = memoryStorage({
      [PREFERENCES_KEY]: JSON.stringify({ v: 1, mode: 'dark' }),
      'tgmc-theme-mode': 'light',
      'tgmc-brand-roles': '{"primary":"#1f6feb"}',
    });
    expect(loadDocument(storage).mode).toBe('dark');
    expect(map.has('tgmc-theme-mode')).toBe(false);
    expect(map.has('tgmc-brand-roles')).toBe(false);
  });
});

describe('legacy conversion when storage writes fail', () => {
  function failingWrites(seed: Record<string, string>) {
    const memory = memoryStorage(seed);
    const storage = {
      getItem: memory.storage.getItem,
      removeItem: memory.storage.removeItem,
      setItem: () => {
        throw new DOMException('full', 'QuotaExceededError');
      },
    };
    return { ...memory, storage };
  }

  afterEach(() => {
    setupsApi.invalidate();
  });

  it('loadDocument returns the legacy values, does not throw, and leaves the legacy keys', () => {
    const seed = { 'tgmc-theme-mode': 'light', 'tgmc-motion': 'reduced', 'tgmc-brand-roles': '{"primary":"#1f6feb"}' };
    const { storage, map } = failingWrites(seed);
    let doc: ReturnType<typeof loadDocument> | undefined;
    expect(() => (doc = loadDocument(storage))).not.toThrow();
    expect(doc).toMatchObject({ mode: 'light', motion: 'reduced' });
    expect(doc!.brandRoles.primary).toBe('#1f6feb');
    for (const [key, value] of Object.entries(seed)) expect(map.get(key)).toBe(value);
    expect(map.has(PREFERENCES_KEY)).toBe(false);
    expect(() => loadDocument(storage)).not.toThrow();
  });

  it('keeps old-array setups in place and lists them converted for this visit', () => {
    const stored = JSON.stringify([{ id: 'a', name: 'Old', brandRoles: { primary: '#1f6feb' } }]);
    const { storage, map } = failingWrites({ [STYLE_SETUPS_KEY]: stored, 'tgmc-theme-mode': 'dark' });
    expect(() => loadDocument(storage)).not.toThrow();
    expect(map.get(STYLE_SETUPS_KEY)).toBe(stored);
    const [setup] = setupsApi.list(storage);
    expect(setup).toMatchObject({ id: 'a', name: 'Old' });
    expect(setup!.document.mode).toBe('dark');
  });
});

describe('resetPreferenceStorage', () => {
  it('clears every current and legacy key (including tgmc-theme-mode)', () => {
    const seed = Object.fromEntries([...PREFERENCE_KEYS.current, ...PREFERENCE_KEYS.legacy].map((k) => [k, 'x']));
    const { storage, map } = memoryStorage(seed);
    resetPreferenceStorage(storage);
    expect(map.size).toBe(0);
  });
});

describe('a stored colour map from before a runtime name existed is rebuilt on load', () => {
  // A returning visitor's FOUC map can predate names (status / focus variations, status inks,
  // washes): until the next commit, the head script would paint the old status inks (~3.1:1 on a
  // custom pair). Preferences.load (on mount) rewrites the map when names are missing.
  const customPair = () => withPaperInk(defaultPaperInk(), 'dark', { paper: '#2a3814', ink: '#f9fae0' });
  const currentMap = (doc: ReturnType<typeof defaultPreferenceDocument>) =>
    buildRuntimeColorTokens(doc.brandRoles, doc.paperInk, doc.accent)!;

  it('rewrites a stale map (missing names) for a custom paper / ink', () => {
    const doc = { ...defaultPreferenceDocument(), paperInk: customPair() };
    const stale = Object.fromEntries(
      // The pre-branch map: no status / focus variations, status inks or washes.
      Object.entries(currentMap(doc)).filter(([name]) => !/warning|error|info|success|focus|wash/.test(name))
    );
    const { storage } = memoryStorage({
      [PREFERENCES_KEY]: serializePreferenceDocument(doc),
      [COLOR_TOKENS_KEY]: JSON.stringify(stale),
    });
    expect(Object.keys(stale).length).toBeLessThan(RUNTIME_COLOR_TOKEN_NAMES.length);
    expect(refreshStaleColorTokens(storage, doc)).toBe(true);
    expect(JSON.parse(storage.getItem(COLOR_TOKENS_KEY)!)).toEqual(currentMap(doc));
  });

  it('Preferences.load does it on mount (via the facade), and leaves a complete map alone', () => {
    const doc = { ...defaultPreferenceDocument(), paperInk: customPair() };
    const { storage, writes } = memoryStorage({
      [PREFERENCES_KEY]: serializePreferenceDocument(doc),
      [COLOR_TOKENS_KEY]: JSON.stringify({ '--theme-paper-dark-color': '#2a3814' }),
    });
    Preferences.load(storage);
    expect(Object.keys(JSON.parse(storage.getItem(COLOR_TOKENS_KEY)!)).sort()).toEqual(
      [...RUNTIME_COLOR_TOKEN_NAMES].sort()
    );
    writes.length = 0;
    Preferences.load(storage);
    expect(writes).toEqual([]);
  });

  it('writes nothing for the defaults or when there is no stored map', () => {
    const { storage, writes } = memoryStorage();
    expect(refreshStaleColorTokens(storage, defaultPreferenceDocument())).toBe(false);
    const custom = { ...defaultPreferenceDocument(), paperInk: customPair() };
    expect(refreshStaleColorTokens(storage, custom)).toBe(false);
    expect(writes).toEqual([]);
  });

  it('removes a stored map when the document is the defaults (no map is due)', () => {
    const custom = { ...defaultPreferenceDocument(), paperInk: customPair() };
    const { storage, map } = memoryStorage({
      [PREFERENCES_KEY]: serializePreferenceDocument(defaultPreferenceDocument()),
      [COLOR_TOKENS_KEY]: JSON.stringify(currentMap(custom)),
    });
    expect(refreshStaleColorTokens(storage, defaultPreferenceDocument())).toBe(true);
    expect(map.has(COLOR_TOKENS_KEY)).toBe(false);
    expect(refreshStaleColorTokens(storage, defaultPreferenceDocument())).toBe(false);
  });

  it('rewrites a complete map whose values drifted (a builder changed), and only then', () => {
    const doc = { ...defaultPreferenceDocument(), paperInk: customPair() };
    const current = currentMap(doc);
    const drifted = { ...current, '--theme-link-dark-color': '#000001' };
    const { storage, writes } = memoryStorage({
      [PREFERENCES_KEY]: serializePreferenceDocument(doc),
      [COLOR_TOKENS_KEY]: JSON.stringify(drifted),
    });
    expect(Object.keys(drifted).sort()).toEqual([...RUNTIME_COLOR_TOKEN_NAMES].sort());
    expect(refreshStaleColorTokens(storage, doc)).toBe(true);
    expect(JSON.parse(storage.getItem(COLOR_TOKENS_KEY)!)).toEqual(current);
    writes.length = 0;
    expect(refreshStaleColorTokens(storage, doc)).toBe(false);
    expect(writes).toEqual([]);
  });

  it('treats an upper-case but otherwise identical map as current (no write)', () => {
    const doc = { ...defaultPreferenceDocument(), paperInk: customPair() };
    const upper = Object.fromEntries(Object.entries(currentMap(doc)).map(([k, v]) => [k, v.toUpperCase()]));
    const { storage, writes } = memoryStorage({ [COLOR_TOKENS_KEY]: JSON.stringify(upper) });
    expect(refreshStaleColorTokens(storage, doc)).toBe(false);
    expect(writes).toEqual([]);
  });
});

describe('paper / ink parsed from storage is normalised to #rrggbb', () => {
  it('expands #rgb and rgb() to lower-case #rrggbb', () => {
    const parsed = parsePaperInk({
      light: { paper: '#FFF', ink: 'rgb(17, 34, 51)' },
      dark: { paper: '#1A2B3C', ink: '#eee' },
      linked: false,
    });
    expect(parsed).toEqual({
      light: { paper: '#ffffff', ink: '#112233' },
      dark: { paper: '#1a2b3c', ink: '#eeeeee' },
      linked: false,
    });
  });

  it('rejects values that cannot become #rrggbb (alpha, names, junk)', () => {
    const pair = (paper: string) => ({ light: { paper, ink: '#111111' }, dark: { paper: '#222222', ink: '#eeeeee' } });
    expect(parsePaperInk(pair('#ffffff80'))).toBeNull();
    expect(parsePaperInk(pair('#fff8'))).toBeNull();
    expect(parsePaperInk(pair('rgba(1, 2, 3, 0.5)'))).toBeNull();
    expect(parsePaperInk(pair('white'))).toBeNull();
    expect(parsePaperInk(pair('nope'))).toBeNull();
  });

  it('withPaperInk saves only what parsePaperInk reads back (translucent values leave the state unchanged)', () => {
    const base = defaultPaperInk();
    const roundTrip = (state: ReturnType<typeof defaultPaperInk>) => parsePaperInk(JSON.parse(JSON.stringify(state)));
    for (const translucent of ['#fff8', '#ffffff80', 'rgba(1, 2, 3, 0.5)', 'hsla(0, 0%, 50%, 0.5)', 'nope']) {
      const next = withPaperInk(base, 'dark', { paper: translucent, ink: '#eeeeee' });
      expect(next, translucent).toBe(base);
      expect(roundTrip(next), translucent).toEqual(base);
      expect(withPaperInk(base, 'light', { paper: '#ffffff', ink: translucent }), translucent).toBe(base);
    }
    // Opaque alpha forms flatten to #rrggbb and survive the round trip.
    const opaque = withPaperInk(base, 'dark', { paper: '#2A3814FF', ink: 'rgba(249, 250, 224, 1)' });
    expect(opaque.dark).toEqual({ paper: '#2a3814', ink: '#f9fae0' });
    expect(roundTrip(opaque)).toEqual(opaque);
    const doc = { ...defaultPreferenceDocument(), paperInk: opaque };
    expect(parsePreferenceDocument(JSON.parse(serializePreferenceDocument(doc))).paperInk).toEqual(opaque);
  });

  it('a stored #fff paper reaches the FOUC map (the head script paints it)', () => {
    const doc = parsePreferenceDocument({
      v: 1,
      paperInk: { light: { paper: '#fff', ink: '#123' }, dark: { paper: '#123', ink: '#fff' }, linked: false },
    });
    expect(doc.paperInk.light).toEqual({ paper: '#ffffff', ink: '#112233' });
    const map = buildRuntimeColorTokens(doc.brandRoles, doc.paperInk, doc.accent)!;
    const { storage } = memoryStorage();
    persistPreferenceDocument(storage, doc);
    const stored = JSON.parse(storage.getItem(COLOR_TOKENS_KEY)!);
    expect(stored['--theme-paper-light-color']).toBe('#ffffff');
    expect(stored['--theme-ink-light-color']).toBe('#112233');
    expect(Object.keys(stored).sort()).toEqual(Object.keys(map).sort());
  });
});
