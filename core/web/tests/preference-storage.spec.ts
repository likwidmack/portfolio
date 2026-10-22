import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { resolvePreferenceStorage } from '../app/utils/preference-storage';
import { Preferences } from '../shared/preferences';
import { flush } from '../shared/preferences/draft';
import { defaultPreferenceDocument, PREFERENCES_KEY } from '../shared/preferences/storage';
import { setPaintForTests } from '../shared/preferences/testing';

const blocked = () => {
  throw new DOMException('The operation is insecure.', 'SecurityError');
};

describe('resolvePreferenceStorage (blocked browser storage)', () => {
  afterEach(() => {
    flush();
    setPaintForTests(null);
  });

  it('returns localStorage when it can be read', () => {
    const storage = { getItem: () => null, setItem: () => {}, removeItem: () => {} } as unknown as Storage;
    expect(resolvePreferenceStorage(() => storage)).toBe(storage);
  });

  it('falls back to an in-memory store when reading localStorage throws', () => {
    const storage = resolvePreferenceStorage(blocked);
    storage.setItem(PREFERENCES_KEY, '{"v":1}');
    expect(storage.getItem(PREFERENCES_KEY)).toBe('{"v":1}');
    storage.removeItem(PREFERENCES_KEY);
    expect(storage.getItem(PREFERENCES_KEY)).toBeNull();
  });

  it('falls back when localStorage exists but getItem throws', () => {
    const storage = { getItem: blocked, setItem: blocked, removeItem: blocked } as unknown as Storage;
    expect(resolvePreferenceStorage(() => storage)).not.toBe(storage);
  });

  it('Preferences loads defaults from the fallback and keeps commits in memory for the visit', () => {
    vi.useFakeTimers();
    setPaintForTests(vi.fn());
    const storage = resolvePreferenceStorage(blocked);
    expect(Preferences.load(storage)).toEqual(defaultPreferenceDocument());
    Preferences.preview({ motion: 'reduced' });
    Preferences.commit(storage);
    Preferences.flush();
    expect(Preferences.load(storage).motion).toBe('reduced');
    vi.useRealTimers();
  });

  it('usePersonalization reads storage only through the resolved store', () => {
    const src = readFileSync(join(import.meta.dirname, '../app/composables/usePersonalization.ts'), 'utf8');
    expect(src).toContain('resolvePreferenceStorage(');
    expect(src).not.toMatch(/\(localStorage\b/);
  });
});

describe('Style Studio delete', () => {
  it('runs the delete inside withStorageError and offers Undo only after it succeeds', () => {
    const src = readFileSync(join(import.meta.dirname, '../app/components/AppStyleStudio/index.vue'), 'utf8');
    const body = src.slice(src.indexOf('function onDeleteSetup'), src.indexOf('function undoDeleteSetup'));
    const guardedAt = body.indexOf('withStorageError(() => removeSetup(id))');
    expect(guardedAt).toBeGreaterThan(-1);
    expect(body.indexOf('pendingSetupUndo.value =')).toBeGreaterThan(guardedAt);
  });
});
