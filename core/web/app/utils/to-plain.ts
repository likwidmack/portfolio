import { toRaw } from 'vue';

/**
 * Deep copy without Vue proxies. `useState` / `ref` values (and anything read off them) are reactive
 * proxies, which `structuredClone` rejects — Preferences clones everything it is handed.
 */
export function toPlain<T>(value: T): T {
  const raw = toRaw(value);
  if (raw === null || typeof raw !== 'object') return raw;
  if (Array.isArray(raw)) return raw.map((item) => toPlain(item)) as T;
  return Object.fromEntries(Object.entries(raw).map(([key, item]) => [key, toPlain(item)])) as T;
}
