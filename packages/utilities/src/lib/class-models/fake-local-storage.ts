/**
 * In-memory `Storage`-like store that optionally mirrors into `localStorage`
 * when available (SSR-safe: works without `window`).
 *
 * Missing keys return `null` (Web Storage semantics). Values are stored as strings.
 */
export default class FakeLocalStorage {
  private verifyLS = 0;
  /** Primary in-memory map (always authoritative for writes). */
  readonly map = new Map<string, string>();

  /**
   * Lazily syncs the in-memory map into `localStorage` across first accesses,
   * then returns `localStorage` when enabled.
   */
  get db(): null | Storage {
    if (!this.lsEnabled) return null;
    const storage = this.localStorage;
    if (!storage) return null;
    if (this.verifyLS === 2) return storage;

    if (!this.verifyLS) {
      this.verifyLS = 1;
      for (const [key, value] of this.map) {
        storage.setItem(key, value);
      }
    } else if (this.verifyLS === 1) {
      this.verifyLS = 2;
    }

    return storage;
  }

  /** Number of keys (live storage length when mirrored, else map size). */
  get length(): number {
    const storage = this.db;
    if (storage) return storage.length;
    return this.map.size;
  }

  private get lsEnabled(): boolean {
    try {
      return this.localStorage !== null;
    } catch {
      this.verifyLS = 0;
      return false;
    }
  }

  private get localStorage(): Storage | null {
    try {
      return typeof globalThis.localStorage === 'undefined' ? null : globalThis.localStorage;
    } catch {
      return null;
    }
  }

  /** Iterator over in-memory keys. */
  getKeys(): IterableIterator<string> {
    return this.map.keys();
  }

  /** Key at `index`, or `null`. */
  key(index: number): string | null {
    return this.db?.key(index) ?? [...this.map.keys()][index] ?? null;
  }

  /** Read a string value, or `null` if missing. */
  getItem(key: string): string | null {
    return this.map.get(key) ?? this.db?.getItem(key) ?? null;
  }

  /** Write a string value to memory and mirrored storage. */
  setItem(key: string, value: string): void {
    this.map.set(key, value);
    this.db?.setItem(key, value);
  }

  /** Delete a key from memory and mirrored storage. */
  removeItem(key: string): void {
    this.map.delete(key);
    this.db?.removeItem(key);
  }

  /** Clear memory and mirrored storage. */
  clear(): void {
    this.map.clear();
    this.db?.clear();
  }
}
