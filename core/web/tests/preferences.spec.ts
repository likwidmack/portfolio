import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Theme } from '@tgmc/theme';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isProxy, reactive } from 'vue';

import { toPlain } from '../app/utils/to-plain';

import {
  brandRolesFromPack,
  createStyleSetup,
  defaultBrandRoles,
  Preferences,
  STYLE_SETUP_ACTIVE_KEY,
  STYLE_SETUPS_KEY,
} from '../shared/preferences';
import { COLOR_TOKENS_KEY, LEGACY_KEYS } from '../shared/preferences/document';
import { seedDraftState } from '../shared/preferences/draft';
import { createStyleSetupId } from '../shared/preferences/setups';
import { defaultPreferenceDocument, loadPreferenceDocument, PREFERENCES_KEY } from '../shared/preferences/storage';

function memoryStorage(seed: Record<string, string> = {}): Storage {
  const map = new Map(Object.entries(seed));
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, String(v)),
    removeItem: (k) => void map.delete(k),
    key: () => null,
  } as Storage;
}

describe('Preferences.load / reset', () => {
  let applySpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    applySpy = vi.spyOn(Theme, 'apply').mockReturnValue({});
  });

  afterEach(() => {
    Preferences.flush();
    applySpy.mockRestore();
  });

  it('converts legacy keys (incl. old-array setups) before reading', () => {
    const storage = memoryStorage({
      [LEGACY_KEYS.brandRoles]: JSON.stringify({
        primary: '#dc4256',
        secondary: '#2a6f6f',
        accent: '#c45c26',
        secondaryLocked: true,
        accentLocked: true,
      }),
      [LEGACY_KEYS.themeMode]: 'light',
      [STYLE_SETUPS_KEY]: JSON.stringify([{ id: 's1', name: 'Old', brandRoles: { primary: '#112233' } }]),
    });
    const doc = Preferences.load(storage);
    expect(doc.brandRoles.primary.toLowerCase()).toBe('#dc4256');
    expect(doc.mode).toBe('light');
    expect(storage.getItem(LEGACY_KEYS.brandRoles)).toBeNull();
    expect(storage.getItem(PREFERENCES_KEY)).not.toBeNull();
    const [setup] = Preferences.setups.list(storage);
    expect(setup?.document.mode).toBe('light');
    expect(JSON.parse(storage.getItem(STYLE_SETUPS_KEY)!)).toMatchObject({ v: 1 });
  });

  it('flushes a pending commit before reading', () => {
    const storage = memoryStorage();
    Preferences.load(storage);
    Preferences.preview({ motion: 'reduced' });
    Preferences.commit(storage);
    expect(storage.getItem(PREFERENCES_KEY)).toBeNull();
    expect(Preferences.load(storage).motion).toBe('reduced');
  });

  it('reset clears every key, drops the setups cache and returns the default document', () => {
    const storage = memoryStorage();
    Preferences.load(storage);
    Preferences.setups.save(storage, createStyleSetup('One', defaultPreferenceDocument()));
    Preferences.preview({ motion: 'playful', brandRoles: brandRolesFromPack('colorRed', 'dark') });
    Preferences.commit(storage);
    Preferences.flush();
    expect(storage.getItem(COLOR_TOKENS_KEY)).not.toBeNull();
    const doc = Preferences.reset(storage);
    expect(doc).toEqual(defaultPreferenceDocument());
    for (const key of [PREFERENCES_KEY, COLOR_TOKENS_KEY, STYLE_SETUPS_KEY]) expect(storage.getItem(key)).toBeNull();
    expect(Preferences.setups.list(storage)).toEqual([]);
  });
});

describe('Preferences paint', () => {
  it('paintDocument calls Theme.apply / Theme.remove and does not import updateTokens', async () => {
    const apply = vi.spyOn(Theme, 'apply').mockReturnValue({});
    const remove = vi.spyOn(Theme, 'remove').mockReturnValue({});
    const { paintDocument } = await import('../shared/preferences/paint');
    const doc = Preferences.load(memoryStorage());
    paintDocument(doc, 'dark', 'preferences:test');
    expect(apply).toHaveBeenCalledTimes(1);
    expect(apply.mock.calls[0]?.[1]).toMatchObject({ source: 'preferences:test' });
    expect(apply.mock.calls[0]?.[1]).not.toHaveProperty('primevue');
    expect(remove).toHaveBeenCalled();
    apply.mockRestore();
    remove.mockRestore();
  });

  it('paint.ts source does not contain updateTokens', () => {
    const src = readFileSync(join(import.meta.dirname, '../shared/preferences/paint.ts'), 'utf8');
    expect(src).not.toContain('updateTokens');
    expect(src).toContain('Theme.remove');
  });
});

describe('Vue Preferences adapters', () => {
  it('composables do not call updateTokens (paint via Preferences only)', () => {
    const personalization = readFileSync(join(import.meta.dirname, '../app/composables/usePersonalization.ts'), 'utf8');
    const styleStudio = readFileSync(join(import.meta.dirname, '../app/composables/useStyleStudioDraft.ts'), 'utf8');
    expect(personalization).not.toContain('updateTokens');
    expect(styleStudio).not.toContain('updateTokens');
    expect(personalization).toContain('Preferences.');
    expect(styleStudio).toMatch(/commitLive|Preferences/);
  });

  it('applyPatch previews Preferences before setThemeMode (mode-subscribe ordering)', () => {
    const personalization = readFileSync(join(import.meta.dirname, '../app/composables/usePersonalization.ts'), 'utf8');
    const start = personalization.indexOf('const applyPatch');
    const end = personalization.indexOf('const setBackgroundOption');
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const slice = personalization.slice(start, end);
    const previewAt = slice.indexOf('Preferences.preview(toPlain(patch))');
    const setModeAt = slice.indexOf('setThemeMode(patch.mode');
    expect(previewAt).toBeGreaterThan(-1);
    expect(setModeAt).toBeGreaterThan(previewAt);
  });

  it('usePersonalization owns no storage keys or colour-map writes', () => {
    const src = readFileSync(join(import.meta.dirname, '../app/composables/usePersonalization.ts'), 'utf8');
    for (const banned of [
      'persistColorTokens',
      'syncFoucColorTokens',
      'migrateLegacyBackgroundOptions',
      'resetPersonalization',
      'persistStyleSetups',
    ]) {
      expect(src).not.toContain(banned);
    }
    expect(src).toContain('Preferences.bindFlushOnHide(window)');
    expect(src).toContain('Preferences.reset(preferenceStorage())');
  });

  it('usePersonalization hands Preferences plain data (structuredClone rejects Vue proxies)', () => {
    const src = readFileSync(join(import.meta.dirname, '../app/composables/usePersonalization.ts'), 'utf8');
    expect(src).toContain('Preferences.preview(toPlain(patch))');
    const current = src.slice(src.indexOf('const currentDocument'), src.indexOf('const ensurePreferences'));
    expect(current).toContain('toPlain(');
  });

  it('usePersonalization reloads setups (converting an old array) when another tab writes setups', () => {
    const src = readFileSync(join(import.meta.dirname, '../app/composables/usePersonalization.ts'), 'utf8');
    const listener = src.slice(src.indexOf("addEventListener('storage'"), src.indexOf('initialized.value = true'));
    expect(listener).toContain('Preferences.setups.reload(');
    expect(src).not.toContain('Preferences.setups.invalidate()');
  });

  it('Style Studio shows the setup-limit message in the existing alert', () => {
    const src = readFileSync(join(import.meta.dirname, '../app/components/AppStyleStudio/index.vue'), 'utf8');
    expect(src).toContain(
      'const SETUP_LIMIT_MESSAGE = `You have ${STYLE_SETUPS_MAX} setups — delete one to save another`'
    );
    expect(src).toContain('p.style-studio__save-error(v-if="saveError", role="alert") {{ saveError }}');
    expect(src).toContain('setup.document.brandRoles.primary');
    expect(src).not.toContain('setup.brandRoles.');
  });

  it('removeSetup clears the live active id whenever it is the deleted setup (draft selection is not stored)', () => {
    const src = readFileSync(join(import.meta.dirname, '../app/composables/usePersonalization.ts'), 'utf8');
    const remove = src.slice(src.indexOf('const removeSetup'), src.indexOf('const restoreSetup'));
    expect(remove).not.toContain('clearedActive');
    expect(remove).toMatch(/\n {4}if \(activeSetupId\.value === id\) activeSetupId\.value = null;\n {2}\};/);
    const draft = readFileSync(join(import.meta.dirname, '../app/composables/useStyleStudioDraft.ts'), 'utf8');
    expect(draft).not.toMatch(/useState<string \| null>/);
  });

  it('restoreSetup reports a refused restore and leaves the active id alone', () => {
    const src = readFileSync(join(import.meta.dirname, '../app/composables/usePersonalization.ts'), 'utf8');
    const restore = src.slice(src.indexOf('const restoreSetup'), src.indexOf('const reset ='));
    expect(restore).toContain('): boolean =>');
    const refusedAt = restore.indexOf('if (!result.ok) return false;');
    expect(refusedAt).toBeGreaterThan(-1);
    expect(restore.indexOf('setActiveId(')).toBeGreaterThan(refusedAt);
  });

  it('Style Studio Undo shows the setup limit and keeps the pending undo when the restore is refused', () => {
    const src = readFileSync(join(import.meta.dirname, '../app/components/AppStyleStudio/index.vue'), 'utf8');
    const undo = src.slice(src.indexOf('function undoDeleteSetup'), src.indexOf('const SETUP_LIMIT_MESSAGE'));
    const refusedAt = undo.indexOf('saveError.value = SETUP_LIMIT_MESSAGE;');
    expect(refusedAt).toBeGreaterThan(-1);
    expect(undo.slice(refusedAt, undo.indexOf('pendingSetupUndo.value = null'))).toContain('return;');
  });

  it('Styles Parity switches mode through the Studio draft, not Theme storage', () => {
    const src = readFileSync(join(import.meta.dirname, '../app/components/AppStylesParity/index.vue'), 'utf8');
    expect(src).not.toContain('setThemeMode(mode)');
    expect(src).toContain('setDraftMode(mode)');
  });

  it('theme plugin passes the Preferences mode and no storage key', () => {
    const src = readFileSync(join(import.meta.dirname, '../app/plugins/theme-tokens.client.ts'), 'utf8');
    expect(src).toContain('Preferences.load(localStorage).mode');
    expect(src).not.toContain('storageKey');
  });
});

describe('toPlain (Vue proxies → structuredClone-safe data)', () => {
  it('structuredClone rejects a reactive document; toPlain output clones', () => {
    const live = reactive({ doc: defaultPreferenceDocument() });
    const nested = { brandRoles: live.doc.brandRoles, paperInk: live.doc.paperInk };
    expect(() => structuredClone(nested)).toThrow();
    const plain = toPlain(nested);
    expect(isProxy(plain.brandRoles)).toBe(false);
    expect(isProxy(plain.paperInk.light)).toBe(false);
    expect(structuredClone(plain)).toEqual(nested);
    expect(() => createStyleSetup('Reactive', toPlain(live.doc))).not.toThrow();
  });
});

describe('Preferences draft', () => {
  let applySpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    applySpy = vi.spyOn(Theme, 'apply').mockReturnValue({});
  });

  afterEach(() => {
    Preferences.flush();
    applySpy.mockRestore();
  });

  it('preview updates draft and does not persist', () => {
    const storage = memoryStorage();
    Preferences.load(storage);
    Preferences.preview({ motion: 'reduced' });
    expect(Preferences.getDraft().motion).toBe('reduced');
    Preferences.flush();
    expect(storage.getItem(PREFERENCES_KEY)).toBeNull();
  });

  it('commit persists draft; discard restores committed', () => {
    const storage = memoryStorage();
    Preferences.load(storage);
    Preferences.preview({ motion: 'playful' });
    Preferences.commit(storage);
    Preferences.flush();
    expect(loadPreferenceDocument(storage).motion).toBe('playful');
    Preferences.preview({ motion: 'reduced' });
    Preferences.discard();
    expect(Preferences.getDraft().motion).toBe('playful');
  });

  it('seeds, previews, commits and discards with reactive (Proxy) documents without throwing', () => {
    const storage = memoryStorage();
    const doc = reactive(Preferences.load(storage));
    expect(() => seedDraftState(doc)).not.toThrow();
    const roles = reactive({ ...doc.brandRoles });
    expect(() =>
      Preferences.preview({ motion: 'playful', brandRoles: roles, backgroundOptions: reactive({}) })
    ).not.toThrow();
    expect(Preferences.getDraft().motion).toBe('playful');
    expect(isProxy(Preferences.getDraft().brandRoles)).toBe(false);
    expect(() => Preferences.commit(storage)).not.toThrow();
    Preferences.flush();
    expect(loadPreferenceDocument(storage).motion).toBe('playful');
    Preferences.preview({ motion: 'reduced' });
    expect(() => Preferences.discard()).not.toThrow();
    expect(Preferences.getDraft().motion).toBe('playful');
  });
});

describe('Preferences.foucScript', () => {
  it('foucScript embeds bake-time facts and never imports @tgmc/theme at runtime', () => {
    const script = Preferences.foucScript();
    expect(script).toContain('ls=localStorage');
    expect(script).toContain('ls.getItem');
    expect(script).toContain('setProperty');
    expect(script).not.toMatch(/@tgmc\/theme/);
  });

  it('builds FOUC script from the persisted colour map (no brand-role maths in head)', () => {
    const script = Preferences.foucScript();
    expect(script).toContain('tgmc-theme-color-tokens');
    expect(script).toContain("getItem('tgmc-preferences')");
    expect(script).toContain('--theme-primary-light-color');
    expect(script).not.toContain('function bf(');
    expect(script).not.toContain("'--primary-color'");
    expect(script).not.toContain('coral');
  });
});

describe('Preferences.setups', () => {
  let applySpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    applySpy = vi.spyOn(Theme, 'apply').mockReturnValue({});
  });

  afterEach(() => {
    Preferences.flush();
    applySpy.mockRestore();
  });

  it('round-trips list/save/apply/delete through draft+Theme.apply', () => {
    const storage = memoryStorage();
    Preferences.load(storage);

    const setup = createStyleSetup('Studio dusk', {
      ...defaultPreferenceDocument(),
      brandRoles: brandRolesFromPack('colorRed', 'dark'),
      motion: 'playful',
      background: 'grid',
      backgroundCustom: '#112233',
      mode: 'dark',
    });
    expect(setup.id).toBeTruthy();
    expect(createStyleSetupId()).not.toBe(setup.id);

    Preferences.setups.save(storage, setup);
    Preferences.setups.setActiveId(storage, setup.id);
    expect(Preferences.setups.list(storage)).toHaveLength(1);
    expect(Preferences.setups.getActiveId(storage)).toBe(setup.id);

    const applied = Preferences.setups.apply(storage, setup);
    expect(applied.motion).toBe('playful');
    expect(applied.background).toBe('grid');
    expect(Preferences.getDraft().motion).toBe('playful');
    expect(Preferences.getCommitted().background).toBe('grid');
    const stored = loadPreferenceDocument(storage);
    expect(stored.brandRoles.primary.toLowerCase()).toBe(setup.document.brandRoles.primary.toLowerCase());
    expect(stored.motion).toBe('playful');
    expect(stored.backgroundCustom.toLowerCase()).toBe('#112233');
    expect(storage.getItem(STYLE_SETUP_ACTIVE_KEY)).toBe(setup.id);
    expect(applySpy).toHaveBeenCalled();
    expect(applySpy.mock.calls.at(-1)?.[1]).toMatchObject({ source: 'preferences:setups:apply' });

    Preferences.setups.save(storage, createStyleSetup('Studio dusk v2', setup.document, setup.id));
    expect(Preferences.setups.list(storage)[0]?.name).toBe('Studio dusk v2');

    const deleted = Preferences.setups.delete(storage, setup.id);
    expect(deleted.setups).toHaveLength(0);
    expect(deleted.clearedActive).toBe(true);
    expect(Preferences.setups.getActiveId(storage)).toBeNull();
  });

  it('returns an empty setup list for corrupt JSON without touching live prefs', () => {
    const storage = memoryStorage({
      [STYLE_SETUPS_KEY]: '{not-json',
      [PREFERENCES_KEY]: JSON.stringify({ v: 1, motion: 'reduced' }),
    });
    const doc = Preferences.load(storage);
    expect(Preferences.setups.list(storage)).toEqual([]);
    expect(doc.motion).toBe('reduced');
    expect(doc.brandRoles.primary).toBe(defaultBrandRoles('dark').primary);
  });
});
