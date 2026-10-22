/**
 * Preferences draft state machine — committed vs in-memory draft.
 * Preview paints via `paintDocument` (DOM, not dryRun); commit paints now and writes after
 * {@link COMMIT_WRITE_DELAY_MS}; discard restores.
 */
import { Theme } from '@tgmc/theme';

import type { PreferenceDocument } from './document';
import { convertLegacyPreferences, convertLegacyStyleSetups } from './legacy';
import { paintDocument } from './paint';
import { setupsApi } from './setups';
import {
  defaultPreferenceDocument,
  loadPreferenceDocument,
  persistPreferenceDocument,
  resetPreferenceStorage,
  type PreferenceStorage,
} from './storage';

type PaintFn = typeof paintDocument;

/** Trailing delay between the last commit and the storage write. */
export const COMMIT_WRITE_DELAY_MS = 250;

let committed: PreferenceDocument | null = null;
let draft: PreferenceDocument | null = null;
let paintFn: PaintFn = paintDocument;
let pendingStorage: PreferenceStorage | null = null;
let writeTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Deep-copy plain JSON-safe data. Walks arrays/objects property by property so Vue
 * reactive/ref Proxies (which `structuredClone` rejects with DataCloneError) are
 * unwrapped into plain values; callers like `usePersonalization` pass `useState` values.
 */
function clonePlain<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => clonePlain(item)) as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value)) out[key] = clonePlain((value as Record<string, unknown>)[key]);
    return out as T;
  }
  return value;
}

function cloneDocument(doc: PreferenceDocument): PreferenceDocument {
  return clonePlain(doc);
}

function requireSeeded(): { committed: PreferenceDocument; draft: PreferenceDocument } {
  if (!committed || !draft) {
    throw new Error('Preferences.load must be called before preview/commit/discard');
  }
  return { committed, draft };
}

/** Resolve light|dark for paint — reuse Theme.resolveMode (system → OS, no browser → dark). */
function resolvedModeFor(doc: PreferenceDocument): 'light' | 'dark' {
  const preference = doc.mode === 'light' || doc.mode === 'dark' || doc.mode === 'system' ? doc.mode : 'system';
  return Theme.resolveMode(preference);
}

function paint(doc: PreferenceDocument, source: string): void {
  paintFn(doc, resolvedModeFor(doc), source);
}

/** Seed committed + draft from a loaded document (no paint). */
export function seedDraftState(doc: PreferenceDocument): void {
  committed = cloneDocument(doc);
  draft = cloneDocument(doc);
}

export function getDraft(): PreferenceDocument {
  return cloneDocument(requireSeeded().draft);
}

export function getCommitted(): PreferenceDocument {
  return cloneDocument(requireSeeded().committed);
}

/** Merge patch into draft, paint DOM, do not persist. */
export function preview(patch: Partial<PreferenceDocument>): PreferenceDocument {
  const state = requireSeeded();
  // Clone the whole merge so Vue proxies from adapters never linger in `draft`.
  draft = cloneDocument({ ...state.draft, ...patch });
  paint(draft, 'preferences:preview');
  return getDraft();
}

function clearWriteTimer(): void {
  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = null;
}

/** Write the pending committed document now (no-op when nothing is pending; a failed write is dropped). */
export function flush(): void {
  clearWriteTimer();
  const storage = pendingStorage;
  pendingStorage = null;
  if (!storage || !committed) return;
  try {
    persistPreferenceDocument(storage, committed);
  } catch {
    // Quota / private-mode storage errors: the document stays painted and in memory.
  }
}

/** Drop a scheduled write without writing (reset). */
export function cancelPendingWrite(): void {
  clearWriteTimer();
  pendingStorage = null;
}

/** Flush, convert legacy keys and setups once, read and seed committed + draft (no paint). */
export function loadDocument(storage: PreferenceStorage): PreferenceDocument {
  flush();
  setupsApi.invalidate();
  const doc = convertLegacyPreferences(storage) ?? loadPreferenceDocument(storage);
  convertLegacyStyleSetups(storage, doc.mode);
  seedDraftState(doc);
  return cloneDocument(doc);
}

/** Flush, then make `doc` committed + draft, write it now and paint (setup apply). */
export function commitNow(storage: PreferenceStorage, doc: PreferenceDocument, source: string): PreferenceDocument {
  flush();
  persistPreferenceDocument(storage, doc);
  seedDraftState(doc);
  paint(requireSeeded().committed, source);
  return getCommitted();
}

/** Draft becomes committed and is painted now; the storage write follows after {@link COMMIT_WRITE_DELAY_MS}. */
export function commit(storage: PreferenceStorage): PreferenceDocument {
  const state = requireSeeded();
  committed = cloneDocument(state.draft);
  paint(committed, 'preferences:commit');
  pendingStorage = storage;
  clearWriteTimer();
  writeTimer = setTimeout(flush, COMMIT_WRITE_DELAY_MS);
  return getCommitted();
}

/** Restore draft from committed and re-paint. */
export function discard(): PreferenceDocument {
  const state = requireSeeded();
  draft = cloneDocument(state.committed);
  paint(draft, 'preferences:discard');
  return getDraft();
}

/** Clear every Preferences key and seed the default document (no paint). */
export function resetDocument(storage: PreferenceStorage): PreferenceDocument {
  cancelPendingWrite();
  setupsApi.invalidate();
  resetPreferenceStorage(storage);
  const doc = defaultPreferenceDocument();
  seedDraftState(doc);
  return cloneDocument(doc);
}

/** Flush pending writes when the page is hidden or unloaded. Returns an unbind function. */
export function bindFlushOnHide(win: Window): () => void {
  const onPageHide = () => flush();
  const onVisibility = () => {
    if (win.document.visibilityState === 'hidden') flush();
  };
  win.addEventListener('pagehide', onPageHide);
  win.document.addEventListener('visibilitychange', onVisibility);
  return () => {
    win.removeEventListener('pagehide', onPageHide);
    win.document.removeEventListener('visibilitychange', onVisibility);
  };
}

/** Internal paint override (re-exported for tests by `./testing`). */
export function setPaintFn(fn: PaintFn | null): void {
  paintFn = fn ?? paintDocument;
}
