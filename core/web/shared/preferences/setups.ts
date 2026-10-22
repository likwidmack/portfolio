/**
 * Preferences style setups — named copies of a full {@link PreferenceDocument}.
 * Stored as `tgmc-style-setups` = `{ v: 1, setups }`, parsed once and cached, max {@link STYLE_SETUPS_MAX}.
 * List handling and the cache only: flushing, legacy-array conversion and apply are in `./lifecycle`
 * (an old array reads as empty here, so app code goes through `Preferences.setups`).
 */
import { STYLE_SETUP_ACTIVE_KEY, STYLE_SETUPS_KEY, type PreferenceDocument, type StyleSetup } from './document';
import { parsePreferenceDocument, serializePreferenceDocument, type PreferenceStorage } from './storage';

export const STYLE_SETUPS_VERSION = 1;
export const STYLE_SETUPS_MAX = 24;

export type SaveSetupResult = { ok: true; setups: StyleSetup[] } | { ok: false; reason: 'limit'; setups: StyleSetup[] };

let cache: StyleSetup[] | null = null;

/** Stable id for a new setup (UUID when available). */
export function createStyleSetupId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `setup-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createStyleSetup(name: string, document: PreferenceDocument, id?: string): StyleSetup {
  return {
    id: id?.trim() || createStyleSetupId(),
    name: name.trim() || 'Untitled',
    document: structuredClone(document),
  };
}

function parseStyleSetup(value: unknown): StyleSetup | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as { id?: unknown; name?: unknown; document?: unknown };
  if (typeof raw.id !== 'string' || !raw.id.trim()) return null;
  if (typeof raw.name !== 'string' || !raw.name.trim()) return null;
  if (!raw.document || typeof raw.document !== 'object') return null;
  return { id: raw.id.trim(), name: raw.name.trim(), document: parsePreferenceDocument(raw.document) };
}

function readSetups(storage: Pick<Storage, 'getItem'>): StyleSetup[] {
  const raw = storage.getItem(STYLE_SETUPS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as { v?: unknown; setups?: unknown } | null;
    if (!parsed || parsed.v !== STYLE_SETUPS_VERSION || !Array.isArray(parsed.setups)) return [];
    return parsed.setups.map(parseStyleSetup).filter((item): item is StyleSetup => item != null);
  } catch {
    return [];
  }
}

/** Write the list, then cache it (a failed write leaves the cache as it was). Compact document codec. */
export function persistStyleSetups(storage: Pick<Storage, 'setItem'>, setups: StyleSetup[]): void {
  storage.setItem(
    STYLE_SETUPS_KEY,
    JSON.stringify({
      v: STYLE_SETUPS_VERSION,
      setups: setups.map((s) => ({
        id: s.id,
        name: s.name,
        document: JSON.parse(serializePreferenceDocument(s.document)),
      })),
    })
  );
  cache = setups.slice();
}

/** Serve `setups` from the cache without writing (legacy conversion whose write failed). */
export function cacheStyleSetups(setups: StyleSetup[]): void {
  cache = setups.slice();
}

export const setupsApi = {
  list(storage: Pick<Storage, 'getItem'>): StyleSetup[] {
    cache ??= readSetups(storage);
    return cache.slice();
  },

  /** Drop the cache (after reset / another tab). */
  invalidate(): void {
    cache = null;
  },

  save(storage: PreferenceStorage, setup: StyleSetup): SaveSetupResult {
    const current = setupsApi.list(storage);
    const index = current.findIndex((item) => item.id === setup.id);
    if (index < 0 && current.length >= STYLE_SETUPS_MAX) return { ok: false, reason: 'limit', setups: current };
    const copy = structuredClone(setup);
    const next = index < 0 ? [...current, copy] : current.map((item, i) => (i === index ? copy : item));
    persistStyleSetups(storage, next);
    return { ok: true, setups: next };
  },

  delete(storage: PreferenceStorage, id: string): { setups: StyleSetup[]; clearedActive: boolean } {
    const current = setupsApi.list(storage);
    if (!current.some((item) => item.id === id)) return { setups: current, clearedActive: false };
    const activeId = setupsApi.getActiveId(storage);
    const next = current.filter((item) => item.id !== id);
    persistStyleSetups(storage, next);
    const clearedActive = activeId === id;
    if (clearedActive) storage.removeItem(STYLE_SETUP_ACTIVE_KEY);
    return { setups: next, clearedActive };
  },

  /** Undo a delete: re-insert at the former position. Refused (nothing written) when the list is full. */
  restore(storage: PreferenceStorage, setup: StyleSetup, index: number): SaveSetupResult {
    const current = setupsApi.list(storage);
    if (current.some((item) => item.id === setup.id)) return { ok: true, setups: current };
    if (current.length >= STYLE_SETUPS_MAX) return { ok: false, reason: 'limit', setups: current };
    const at = Math.max(0, Math.min(index, current.length));
    const next = [...current.slice(0, at), structuredClone(setup), ...current.slice(at)];
    persistStyleSetups(storage, next);
    return { ok: true, setups: next };
  },

  getActiveId(storage: Pick<Storage, 'getItem'>): string | null {
    return storage.getItem(STYLE_SETUP_ACTIVE_KEY)?.trim() || null;
  },

  setActiveId(storage: Pick<Storage, 'setItem' | 'removeItem'>, id: string | null): void {
    if (id) storage.setItem(STYLE_SETUP_ACTIVE_KEY, id);
    else storage.removeItem(STYLE_SETUP_ACTIVE_KEY);
  },
} as const;
