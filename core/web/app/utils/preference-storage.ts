import { STYLE_SETUP_ACTIVE_KEY, type PreferenceStorage } from '#shared/preferences';

function memoryStorage(): PreferenceStorage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => void values.set(key, String(value)),
    removeItem: (key) => void values.delete(key),
  };
}

/**
 * The store Preferences reads and writes: `localStorage`, or an in-memory stand-in when the browser
 * blocks it (`SecurityError` on access), so preferences start from the defaults and last for this visit.
 */
export function resolvePreferenceStorage(read: () => Storage): PreferenceStorage {
  try {
    const storage = read();
    storage.getItem(STYLE_SETUP_ACTIVE_KEY);
    return storage;
  } catch {
    return memoryStorage();
  }
}
