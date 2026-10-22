/**
 * Legacy flat preference keys (pre-`tgmc-preferences`). Read once by {@link convertLegacyPreferences}
 * and the FOUC fallback, then removed. Old array-shaped setups are rewritten by
 * {@link convertLegacyStyleSetups}. Delete this file (and the FOUC fallback) next release.
 */
import {
  brandRolesFromPack,
  defaultBrandRoles,
  defaultPaperInk,
  isAccent,
  isMotion,
  isStyleSetupMode,
  LEGACY_KEYS,
  parseBrandRoles,
  parsePaperInk,
  resolveAccentId,
  resolveBackgroundCustom,
  resolveBackgroundMode,
  sanitizeBackgroundOptions,
  STYLE_SETUPS_KEY,
  type BrandRolesState,
  type PreferenceDocument,
  type StyleSetup,
  type StyleSetupMode,
  type ThemeResolvedMode,
} from './document';
import { cacheStyleSetups, persistStyleSetups } from './setups';
import { persistPreferenceDocument, PREFERENCES_KEY, type PreferenceStorage } from './storage';

export { LEGACY_KEYS };

function parseJson(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function legacyBrandRoles(storage: Pick<Storage, 'getItem'>, mode: ThemeResolvedMode): BrandRolesState {
  const fromKey = parseBrandRoles(parseJson(storage.getItem(LEGACY_KEYS.brandRoles)));
  if (fromKey) return fromKey;
  const pack = storage.getItem(LEGACY_KEYS.accent);
  return isAccent(pack) ? brandRolesFromPack(pack, mode) : defaultBrandRoles(mode);
}

/** Read the committed document from the legacy flat keys (same rules as the old loader). */
export function readLegacyPreferences(storage: Pick<Storage, 'getItem'>): PreferenceDocument {
  const mode = storage.getItem(LEGACY_KEYS.themeMode);
  const motion = storage.getItem(LEGACY_KEYS.motion);
  return {
    mode: isStyleSetupMode(mode) ? mode : 'system',
    accent: resolveAccentId(storage.getItem(LEGACY_KEYS.accent)),
    brandRoles: legacyBrandRoles(storage, 'dark'),
    motion: isMotion(motion) ? motion : 'system',
    background: resolveBackgroundMode(storage.getItem(LEGACY_KEYS.background)),
    backgroundCustom: resolveBackgroundCustom(storage.getItem(LEGACY_KEYS.backgroundCustom)),
    paperInk: parsePaperInk(parseJson(storage.getItem(LEGACY_KEYS.paperInk))) ?? defaultPaperInk(),
    backgroundOptions: sanitizeBackgroundOptions(parseJson(storage.getItem(LEGACY_KEYS.backgroundOptions))),
  };
}

function hasLegacyPreferenceKeys(storage: Pick<Storage, 'getItem'>): boolean {
  return Object.values(LEGACY_KEYS).some((key) => storage.getItem(key) != null);
}

function removeLegacyPreferenceKeys(storage: Pick<Storage, 'removeItem'>): void {
  for (const key of Object.values(LEGACY_KEYS)) storage.removeItem(key);
}

/**
 * One-time conversion: legacy flat keys → `tgmc-preferences` (+ colour map), then remove them.
 * Writes the new key before removing the old ones. Returns the converted document, or `null` when
 * no legacy key is present or the new key already exists — then leftover legacy keys (an old-bundle
 * tab, or a failed conversion followed by a successful write) are removed unread: the new key wins.
 * A failed write keeps the legacy keys (retried on the next load) and still returns the document.
 */
export function convertLegacyPreferences(storage: PreferenceStorage): PreferenceDocument | null {
  if (!hasLegacyPreferenceKeys(storage)) return null;
  if (storage.getItem(PREFERENCES_KEY) != null) {
    removeLegacyPreferenceKeys(storage);
    return null;
  }
  const doc = readLegacyPreferences(storage);
  try {
    persistPreferenceDocument(storage, doc);
  } catch {
    storage.removeItem(PREFERENCES_KEY);
    return doc;
  }
  removeLegacyPreferenceKeys(storage);
  return doc;
}

type LegacySetup = {
  id?: unknown;
  name?: unknown;
  brandRoles?: unknown;
  motion?: unknown;
  background?: unknown;
  backgroundCustom?: unknown;
  mode?: unknown;
  paperInk?: unknown;
  backgroundOptions?: unknown;
};

/** Old flat setup → full document. Old setups had no pack; a missing mode takes the current one. */
function parseLegacyStyleSetup(value: unknown, currentMode: StyleSetupMode): StyleSetup | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as LegacySetup;
  if (typeof raw.id !== 'string' || !raw.id.trim() || typeof raw.name !== 'string' || !raw.name.trim()) return null;
  const brandRoles = parseBrandRoles(raw.brandRoles);
  if (!brandRoles) return null;
  const motion = typeof raw.motion === 'string' ? raw.motion : null;
  return {
    id: raw.id.trim(),
    name: raw.name.trim(),
    document: {
      mode: isStyleSetupMode(raw.mode) ? raw.mode : currentMode,
      accent: null,
      brandRoles,
      motion: isMotion(motion) ? motion : 'system',
      background: resolveBackgroundMode(typeof raw.background === 'string' ? raw.background : null),
      backgroundCustom: resolveBackgroundCustom(typeof raw.backgroundCustom === 'string' ? raw.backgroundCustom : null),
      paperInk: parsePaperInk(raw.paperInk) ?? defaultPaperInk(),
      backgroundOptions: sanitizeBackgroundOptions(raw.backgroundOptions),
    },
  };
}

/**
 * One-time conversion of the old setups array to `{ v: 1, setups }`. No-op for the new shape.
 * A failed write keeps the old array (retried on the next load) and caches the converted list.
 */
export function convertLegacyStyleSetups(storage: PreferenceStorage, currentMode: StyleSetupMode): boolean {
  const parsed = parseJson(storage.getItem(STYLE_SETUPS_KEY));
  if (!Array.isArray(parsed)) return false;
  const setups = parsed
    .map((item) => parseLegacyStyleSetup(item, currentMode))
    .filter((item): item is StyleSetup => item != null);
  // Not truncated to STYLE_SETUPS_MAX: old lists keep every setup; `save` refuses new ids until under the limit.
  try {
    persistStyleSetups(storage, setups);
  } catch {
    cacheStyleSetups(setups);
    return false;
  }
  return true;
}
