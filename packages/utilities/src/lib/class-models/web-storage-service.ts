/**
 * Low-level browser storage: `localStorage`, `sessionStorage`, and cookies.
 *
 * Async methods (`set` / `get` / `remove` / `has` / `clear`) are SSR-safe
 * (no-op / `null` when `window` / `document` are missing). Sync helpers
 * (`setItem` / `getItem` / …) operate on the constructor's default driver
 * (`local` | `session` only — cookie is async-path only).
 *
 * @module
 */

/** Persistence backend for {@link WebStorageService}. */
export type StorageDriver = 'local' | 'session' | 'cookie';

/** Well-known app keys (optional typing aid). */
export type WebStorageKey = 'oidc_requested_url' | 'tenant_id_default' | 'oidc_config';

/** Options when writing a document cookie. */
export interface CookieOptions {
  expires?: Date;
  maxAge?: number;
  path?: string;
  domain?: string;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

/** Per-call override for {@link WebStorageService.set}. */
export interface StorageSetOptions {
  driver?: StorageDriver;
  cookie?: CookieOptions;
}

/** Per-call override for {@link WebStorageService.get} / {@link WebStorageService.has}. */
export interface StorageGetOptions {
  driver?: StorageDriver;
}

/**
 * Unified API over localStorage, sessionStorage, and cookies with JSON
 * serialization and SSR guards.
 */
export class WebStorageService {
  private readonly _defaultDriver: StorageDriver;

  /**
   * @param defaultDriver - Driver used when call options omit `driver` (default `'local'`)
   */
  constructor(defaultDriver: StorageDriver = 'local') {
    this._defaultDriver = defaultDriver;

    if (typeof window !== 'undefined' && defaultDriver !== 'cookie') {
      window.addEventListener('storage', (event: StorageEvent) => {
        console.debug(`WebStorageService: Detected storage event for key "${event.key}" on driver "${defaultDriver}".`);
      });
    }
  }

  /**
   * Persist `value` as JSON. `undefined` removes the key.
   * No-ops when the resolved Web Storage API is unavailable (SSR).
   */
  async set<T>(key: string, value: T, options: StorageSetOptions = {}): Promise<void> {
    const driver = options.driver ?? this._defaultDriver;

    if (value === undefined) {
      return this.remove(key, driver);
    }

    if (driver === 'cookie') {
      this._setCookie(key, value, options.cookie);
      return;
    }

    const storage = this._resolveStorage(driver);
    if (!storage) return;

    try {
      storage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('WebStorageService: Failed to save to storage', error);
      throw error;
    }
  }

  /** Read and JSON-parse a value, or `null` if missing / SSR. */
  async get<T>(key: string, options: StorageGetOptions = {}): Promise<T | null> {
    const driver = options.driver ?? this._defaultDriver;

    if (driver === 'cookie') {
      const value = this._getCookie(key);
      return value === null ? null : this.parse<T>(value);
    }

    const storage = this._resolveStorage(driver);
    if (!storage) return null;

    const value = storage.getItem(key);
    return value === null ? null : this.parse<T>(value);
  }

  /** Remove a key from the chosen driver. */
  async remove(key: string, driver: StorageDriver = this._defaultDriver): Promise<void> {
    if (driver === 'cookie') {
      this._removeCookie(key);
      return;
    }

    this._resolveStorage(driver)?.removeItem(key);
  }

  /** Clear all keys for a driver (cookies: expire each accessible cookie). */
  clear(driver: StorageDriver = this._defaultDriver): void {
    if (driver === 'cookie') {
      if (typeof document === 'undefined') return;

      for (const pair of document.cookie ? document.cookie.split(';') : []) {
        const [name] = pair.trim().split('=');
        this._removeCookie(decodeURIComponent(name));
      }
      return;
    }

    this._resolveStorage(driver)?.clear();
  }

  /** `true` when {@link get} would return a non-null value. */
  async has(key: string, options: StorageGetOptions = {}): Promise<boolean> {
    return (await this.get(key, options)) !== null;
  }

  /** Item count for the default Web Storage driver (`0` on SSR / cookie default). */
  get length(): number {
    return this._resolveStorage(this._defaultDriver)?.length ?? 0;
  }

  /** Sync JSON write to the default driver (`undefined` removes). */
  setItem(key: string, content: unknown): void {
    if (content === undefined) {
      this.removeItem(key);
      return;
    }

    const storage = this._resolveStorage(this._defaultDriver);
    if (!storage) return;

    try {
      storage.setItem(key, JSON.stringify(content));
    } catch {
      storage.setItem(key, String(content));
    }
  }

  /** Sync JSON read from the default driver. */
  getItem<T = unknown>(key: string): T | null {
    const value = this._resolveStorage(this._defaultDriver)?.getItem(key) ?? null;
    return value === null ? null : this.parse<T>(value);
  }

  /** Sync remove on the default driver. */
  removeItem(key: string): void {
    this._resolveStorage(this._defaultDriver)?.removeItem(key);
  }

  /** Sync clear on the default driver. */
  clearStorage(): void {
    this._resolveStorage(this._defaultDriver)?.clear();
  }

  private _setCookie<T>(key: string, value: T, options: CookieOptions = {}): void {
    if (typeof document === 'undefined') return;

    let cookie = `${encodeURIComponent(key)}=${encodeURIComponent(JSON.stringify(value))}`;
    if (options.maxAge !== undefined) cookie += `; Max-Age=${options.maxAge}`;
    if (options.expires) cookie += `; Expires=${options.expires.toUTCString()}`;
    cookie += `; Path=${options.path ?? '/'}`;
    if (options.domain) cookie += `; Domain=${options.domain}`;
    if (options.sameSite) cookie += `; SameSite=${options.sameSite}`;
    if (options.secure) cookie += '; Secure';
    document.cookie = cookie;
  }

  private _getCookie(key: string): string | null {
    if (typeof document === 'undefined') return null;

    const encodedKey = encodeURIComponent(key);
    for (const cookie of document.cookie ? document.cookie.split(';') : []) {
      const trimmedCookie = cookie.trim();
      const separatorIndex = trimmedCookie.indexOf('=');
      const cookieKey = separatorIndex === -1 ? trimmedCookie : trimmedCookie.slice(0, separatorIndex);

      if (cookieKey === encodedKey) {
        const value = separatorIndex === -1 ? '' : trimmedCookie.slice(separatorIndex + 1);
        return decodeURIComponent(value);
      }
    }

    return null;
  }

  private _removeCookie(key: string, path = '/'): void {
    if (typeof document === 'undefined') return;

    document.cookie = `${encodeURIComponent(key)}=; Max-Age=0; Path=${path}`;
  }

  private parse<T>(value: string): T {
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as T;
    }
  }

  private _resolveStorage(driver: StorageDriver): Storage | null {
    if (typeof window === 'undefined' || driver === 'cookie') return null;

    return driver === 'local' ? window.localStorage : window.sessionStorage;
  }
}

/** Alias of {@link WebStorageService} for `core/web` compatibility. */
export { WebStorageService as StorageService };

/** Shared singleton instance (default driver `'local'`). */
export const storage = new WebStorageService();

export default storage;
