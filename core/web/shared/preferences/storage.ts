/**
 * Preferences storage — one versioned key (`tgmc-preferences`), the key inventory, the codec,
 * load / persist / reset. Legacy flat keys: `./legacy`. Write timing: `./draft`.
 */
import {
  COLOR_TOKENS_KEY,
  DEFAULT_BACKGROUND_CUSTOM,
  DEFAULT_BACKGROUND_MODE,
  defaultBrandRoles,
  defaultPaperInk,
  isDefaultPaperInk,
  isMotion,
  isStyleSetupMode,
  LEGACY_KEYS,
  parseBrandRoles,
  parsePaperInk,
  resolveAccentId,
  resolveBackgroundCustom,
  resolveBackgroundMode,
  sanitizeBackgroundOptions,
  STYLE_SETUP_ACTIVE_KEY,
  STYLE_SETUPS_KEY,
  type BrandRolesState,
  type PreferenceDocument,
} from './document';
import { buildRuntimeColorTokens, COLOR_TOKENS_MAX_LENGTH, serializeColorTokens } from './paint';

export const PREFERENCES_KEY = 'tgmc-preferences';
export const PREFERENCES_VERSION = 1;
/** Stored JSON longer than this is ignored (a full document is well under 2 KB). */
export const PREFERENCES_MAX_LENGTH = 8192;

/** Every localStorage key Preferences owns. Load, persist, reset, conversion and docs read this. */
export const PREFERENCE_KEYS = {
  current: [PREFERENCES_KEY, COLOR_TOKENS_KEY, STYLE_SETUPS_KEY, STYLE_SETUP_ACTIVE_KEY],
  legacy: Object.values(LEGACY_KEYS),
} as const;

export type PreferenceStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function defaultPreferenceDocument(): PreferenceDocument {
  return {
    mode: 'system',
    accent: null,
    brandRoles: defaultBrandRoles('dark'),
    motion: 'system',
    background: DEFAULT_BACKGROUND_MODE,
    backgroundCustom: DEFAULT_BACKGROUND_CUSTOM,
    paperInk: defaultPaperInk(),
    backgroundOptions: {},
  };
}

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

/** The only document validator (main key and every setup). Bad fields fall back to defaults. */
export function parsePreferenceDocument(value: unknown): PreferenceDocument {
  const base = defaultPreferenceDocument();
  if (!value || typeof value !== 'object' || Array.isArray(value)) return base;
  const raw = value as Record<string, unknown>;
  if (raw.v !== PREFERENCES_VERSION) return base;
  const motion = asString(raw.motion);
  return {
    mode: isStyleSetupMode(raw.mode) ? raw.mode : base.mode,
    accent: resolveAccentId(asString(raw.accent)),
    brandRoles: parseBrandRoles(raw.brandRoles) ?? base.brandRoles,
    motion: isMotion(motion) ? motion : base.motion,
    background: resolveBackgroundMode(asString(raw.background)),
    backgroundCustom: resolveBackgroundCustom(asString(raw.backgroundCustom)),
    paperInk: parsePaperInk(raw.paperInk) ?? base.paperInk,
    backgroundOptions: sanitizeBackgroundOptions(raw.backgroundOptions),
  };
}

function sameBrandRoles(a: BrandRolesState, b: BrandRolesState): boolean {
  return (
    a.primary === b.primary &&
    a.secondary === b.secondary &&
    a.accent === b.accent &&
    Boolean(a.secondaryLocked) === Boolean(b.secondaryLocked) &&
    Boolean(a.accentLocked) === Boolean(b.accentLocked)
  );
}

/** Compact JSON: default-valued fields are omitted. */
export function serializePreferenceDocument(doc: PreferenceDocument): string {
  const base = defaultPreferenceDocument();
  const out: Record<string, unknown> = { v: PREFERENCES_VERSION };
  if (doc.mode !== base.mode) out.mode = doc.mode;
  if (doc.accent) out.accent = doc.accent;
  const roles = doc.brandRoles;
  if (!sameBrandRoles(roles, base.brandRoles)) {
    out.brandRoles = {
      primary: roles.primary,
      secondary: roles.secondary,
      accent: roles.accent,
      ...(roles.secondaryLocked ? { secondaryLocked: true } : {}),
      ...(roles.accentLocked ? { accentLocked: true } : {}),
    };
  }
  if (doc.motion !== base.motion) out.motion = doc.motion;
  if (doc.background !== base.background) out.background = doc.background;
  if (doc.backgroundCustom !== base.backgroundCustom) out.backgroundCustom = doc.backgroundCustom;
  if (!isDefaultPaperInk(doc.paperInk)) out.paperInk = doc.paperInk;
  if (Object.keys(doc.backgroundOptions).length) out.backgroundOptions = doc.backgroundOptions;
  return JSON.stringify(out);
}

/** Read the committed document (pure; no conversion, no paint). */
export function loadPreferenceDocument(storage: Pick<Storage, 'getItem'>): PreferenceDocument {
  const raw = storage.getItem(PREFERENCES_KEY);
  if (raw == null || raw.length > PREFERENCES_MAX_LENGTH) return defaultPreferenceDocument();
  try {
    return parsePreferenceDocument(JSON.parse(raw));
  } catch {
    return defaultPreferenceDocument();
  }
}

function writeIfChanged(storage: PreferenceStorage, key: string, next: string | null): void {
  const stored = storage.getItem(key);
  if (next == null) {
    if (stored != null) storage.removeItem(key);
  } else if (stored !== next) {
    storage.setItem(key, next);
  }
}

function restoreRaw(storage: PreferenceStorage, key: string, raw: string | null): void {
  try {
    if (raw == null) storage.removeItem(key);
    else storage.setItem(key, raw);
  } catch {
    // Best effort: the original write error is the one callers handle.
  }
}

/**
 * Write the document and its FOUC colour map as a pair; identical values are not rewritten.
 * A failed write puts both keys back to their previous values, then rethrows.
 */
export function persistPreferenceDocument(storage: PreferenceStorage, doc: PreferenceDocument): void {
  const previousDocument = storage.getItem(PREFERENCES_KEY);
  const previousColorTokens = storage.getItem(COLOR_TOKENS_KEY);
  try {
    // Colour map first: it is the larger value, so a quota error usually hits before anything changed.
    writeIfChanged(
      storage,
      COLOR_TOKENS_KEY,
      serializeColorTokens(buildRuntimeColorTokens(doc.brandRoles, doc.paperInk, doc.accent))
    );
    writeIfChanged(storage, PREFERENCES_KEY, serializePreferenceDocument(doc));
  } catch (error) {
    restoreRaw(storage, COLOR_TOKENS_KEY, previousColorTokens);
    restoreRaw(storage, PREFERENCES_KEY, previousDocument);
    throw error;
  }
}

/**
 * The stored FOUC colour map is a cache of `buildRuntimeColorTokens(doc)`: it goes stale when it
 * predates a runtime name (status / focus variations, status inks, washes …) or when a release
 * changes a builder's output for an existing name (a new wash alpha, link / focus target …). The
 * head script would paint those stale values until the next commit. When the document has a custom
 * pick or paper / ink (a map is due), rebuild it and rewrite the stored map if any
 * runtime colour name's value is missing or differs. No stored map, or an
 * identical map: nothing is written. When the document is the defaults (no map is due), a stored
 * map is removed. Returns whether it wrote or removed.
 */
export function refreshStaleColorTokens(storage: PreferenceStorage, doc: PreferenceDocument): boolean {
  const raw = storage.getItem(COLOR_TOKENS_KEY);
  if (raw == null || raw.length > COLOR_TOKENS_MAX_LENGTH) return false;
  const next = buildRuntimeColorTokens(doc.brandRoles, doc.paperInk, doc.accent);
  const json = next ? serializeColorTokens(next) : null;
  if (!json) {
    // The defaults: the stylesheet owns every colour, so a leftover map (from a custom pick reset
    // in another tab, or written by an older release) would only repaint stale values. Remove it.
    try {
      storage.removeItem(COLOR_TOKENS_KEY);
      return true;
    } catch {
      return false;
    }
  }
  let stored: string | null = null;
  try {
    // Sanitised (allowlisted names, lower-case `#rrggbb`) in runtime-name order, so
    // equal strings mean every name is present with the current value.
    stored = serializeColorTokens(JSON.parse(raw) as Record<string, string>);
  } catch {
    // Corrupt: rebuild.
  }
  if (stored === json) return false;
  try {
    storage.setItem(COLOR_TOKENS_KEY, json);
    return true;
  } catch {
    return false;
  }
}

/** Remove every key Preferences owns (current + legacy). */
export function resetPreferenceStorage(storage: Pick<Storage, 'removeItem'>): void {
  for (const key of [...PREFERENCE_KEYS.current, ...PREFERENCE_KEYS.legacy]) storage.removeItem(key);
}
