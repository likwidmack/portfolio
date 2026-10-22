import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  COMMIT_WRITE_DELAY_MS,
  bindFlushOnHide,
  commit,
  flush,
  loadDocument,
  preview,
  resetDocument,
} from '../shared/preferences/draft';
import { PREFERENCES_KEY } from '../shared/preferences/storage';
import { setPaintForTests } from '../shared/preferences/testing';

function countingStorage(seed: Record<string, string> = {}) {
  const map = new Map(Object.entries(seed));
  const sets: string[] = [];
  const storage = {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => {
      sets.push(k);
      map.set(k, v);
    },
    removeItem: (k: string) => void map.delete(k),
  } as unknown as Storage;
  return { storage, map, sets };
}

function quotaExceededStorage(seed: Record<string, string> = {}) {
  const map = new Map(Object.entries(seed));
  const storage = {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: () => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    },
    removeItem: (k: string) => void map.delete(k),
  } as unknown as Storage;
  return { storage, map };
}

function setVisibility(state: DocumentVisibilityState): void {
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: state });
}

function storedMotion(storage: Storage): string | undefined {
  return JSON.parse(storage.getItem(PREFERENCES_KEY)!).motion;
}

describe('Preferences write scheduler', () => {
  const paint = vi.fn();
  beforeEach(() => {
    vi.useFakeTimers();
    setPaintForTests(paint);
    paint.mockClear();
  });
  afterEach(() => {
    flush();
    setPaintForTests(null);
    vi.useRealTimers();
  });

  it('paints on every commit but writes once, 250 ms after the last', () => {
    const { storage, sets } = countingStorage();
    loadDocument(storage);
    for (const motion of ['reduced', 'playful', 'reduced'] as const) {
      preview({ motion });
      commit(storage);
    }
    expect(paint).toHaveBeenCalledTimes(6); // 3 previews + 3 commits
    expect(sets.filter((k) => k === PREFERENCES_KEY)).toHaveLength(0);
    vi.advanceTimersByTime(COMMIT_WRITE_DELAY_MS);
    expect(sets.filter((k) => k === PREFERENCES_KEY)).toHaveLength(1);
    expect(JSON.parse(storage.getItem(PREFERENCES_KEY)!)).toEqual({ v: 1, motion: 'reduced' });
  });

  it('flush writes immediately; load writes nothing', () => {
    const { storage, sets } = countingStorage({ [PREFERENCES_KEY]: '{"v":1,"motion":"reduced"}' });
    loadDocument(storage);
    expect(sets).toHaveLength(0);
    preview({ motion: 'playful' });
    commit(storage);
    flush();
    expect(JSON.parse(storage.getItem(PREFERENCES_KEY)!)).toEqual({ v: 1, motion: 'playful' });
  });

  it('loadDocument flushes a pending write before reading', () => {
    const { storage } = countingStorage();
    loadDocument(storage);
    preview({ motion: 'playful' });
    commit(storage);
    const doc = loadDocument(storage);
    expect(storedMotion(storage)).toBe('playful');
    expect(doc.motion).toBe('playful');
  });

  it('swallows storage write errors from the timer and from loadDocument', () => {
    const { storage } = quotaExceededStorage();
    loadDocument(storage);
    preview({ motion: 'playful' });
    commit(storage);
    expect(() => vi.advanceTimersByTime(COMMIT_WRITE_DELAY_MS)).not.toThrow();

    preview({ motion: 'reduced' });
    commit(storage);
    let doc: ReturnType<typeof loadDocument> | undefined;
    expect(() => {
      doc = loadDocument(storage);
    }).not.toThrow();
    expect(doc?.motion).toBe('system');
    expect(() => vi.advanceTimersByTime(COMMIT_WRITE_DELAY_MS)).not.toThrow();
  });

  it('flushes on pagehide and on visibilitychange → hidden, not while visible; unbind removes both', () => {
    const { storage, sets } = countingStorage();
    const initialVisibility = document.visibilityState;
    loadDocument(storage);
    const unbind = bindFlushOnHide(window);
    try {
      preview({ motion: 'reduced' });
      commit(storage);
      window.dispatchEvent(new Event('pagehide'));
      expect(storedMotion(storage)).toBe('reduced');

      preview({ motion: 'playful' });
      commit(storage);
      setVisibility('visible');
      document.dispatchEvent(new Event('visibilitychange'));
      expect(storedMotion(storage)).toBe('reduced');

      setVisibility('hidden');
      document.dispatchEvent(new Event('visibilitychange'));
      expect(storedMotion(storage)).toBe('playful');

      unbind();
      const writes = sets.length;
      preview({ motion: 'reduced' });
      commit(storage);
      window.dispatchEvent(new Event('pagehide'));
      document.dispatchEvent(new Event('visibilitychange'));
      expect(sets).toHaveLength(writes);
    } finally {
      unbind();
      delete (document as { visibilityState?: DocumentVisibilityState }).visibilityState;
    }
    expect(document.visibilityState).toBe(initialVisibility);
  });

  it('reset drops the pending write and clears every key', () => {
    const { storage, map } = countingStorage({ 'tgmc-theme-mode': 'dark' });
    loadDocument(storage); // converts tgmc-theme-mode → tgmc-preferences
    preview({ motion: 'reduced' });
    commit(storage);
    const doc = resetDocument(storage);
    vi.advanceTimersByTime(COMMIT_WRITE_DELAY_MS);
    expect(doc.mode).toBe('system');
    expect(map.size).toBe(0);
  });
});
