import debounce from '../debounce.js';
import StorageQueue from './storage-queue.js';
import { type StorageDriver, WebStorageService } from './web-storage-service.js';

/** Options for {@link WebStorage}. */
export interface WebStorageOptions {
  /**
   * Key namespace prefix. Persisted keys are `${prefix}.${logicalKey}`.
   * @defaultValue `'likwidmack:web'`
   */
  prefix?: string;
}

/**
 * One in-memory value synchronized with a {@link WebStorageService} driver.
 *
 * Setting `value` archives the previous value and persists the new one.
 * {@link StorageProperty.remove} nulls the value and sets `archive` so further
 * sets are ignored — prefer {@link WebStorage.remove}, which also drops the
 * property from the parent map so the key can be recreated.
 */
export class StorageProperty {
  private readonly _archived = Object.create({});
  private _archiveSequence = 0;
  private readonly _service: WebStorageService;
  /** When `true`, further `value` writes are ignored. */
  archive = false;

  /**
   * @param driverType - Storage driver for this property
   * @param _key - Logical key (without prefix)
   * @param _value - Initial value (persisted immediately)
   * @param _prefix - Namespace prefix for the persisted key
   */
  constructor(
    readonly driverType: StorageDriver,
    private readonly _key: string,
    private _value: any,
    private readonly _prefix: string
  ) {
    this._service = new WebStorageService(driverType);
    void this._setDriverValue(_value);
  }

  /** Fully qualified storage key (`prefix.key`). */
  get key(): string {
    return `${this._prefix}.${this._key}`;
  }

  /** Current in-memory value. */
  get value(): any {
    return this._value;
  }

  set value(content: any) {
    if (this._value === content || this.archive) return;

    const archiveKey = `${new Date().toISOString()}#${++this._archiveSequence}`;
    Object.defineProperty(this._archived, archiveKey, {
      value: this._value,
      writable: false,
      configurable: false,
    });

    this._value = content;
    void this._setDriverValue(content);
  }

  /**
   * Clear the persisted value and lock the property (`archive = true`).
   * Does not remove the entry from a parent {@link WebStorage} map.
   */
  remove(): void {
    if (this.archive) return;

    this.value = null;
    this.archive = true;
  }

  private async _setDriverValue(content: any): Promise<void> {
    if (content === null || content === undefined) {
      await this._service.remove(this.key);
      return;
    }

    await this._service.set(this.key, content);
  }
}

/**
 * High-level storage façade: in-memory {@link StorageProperty} map with
 * debounced batching for updates to existing keys (100ms).
 *
 * @example
 * ```ts
 * const store = new WebStorage('app', { prefix: 'myapp' });
 * store.set('theme', 'dark');
 * store.get('theme'); // 'dark'
 * ```
 */
export class WebStorage {
  private readonly _queue = new StorageQueue<{ key: string; value: any }>();
  protected readonly _db = new Map<string, StorageProperty>();
  private readonly _debouncedQueue: () => void;
  private readonly _prefix: string;

  /**
   * @param _name - Logical store name (diagnostic / identity)
   * @param options - Optional {@link WebStorageOptions}
   */
  constructor(
    private readonly _name: string,
    options: WebStorageOptions = {}
  ) {
    this._prefix = options.prefix ?? 'likwidmack:web';
    this._debouncedQueue = debounce(() => this._processQueue(), 100);
  }

  /** Current ISO timestamp (utility helper). */
  static get datetime(): string {
    return new Date().toISOString();
  }

  /** Store name from the constructor. */
  get name(): string {
    return this._name;
  }

  /** In-memory value for `key`, or `null`. */
  get(key: string): any {
    return this._db.get(key)?.value ?? null;
  }

  /**
   * Create or update a property. New keys persist immediately; existing keys
   * are enqueued and flushed on a 100ms debounce.
   */
  set(key: string, value: any, driver: StorageDriver = 'local'): void {
    const property = this._db.get(key);

    if (property) {
      this._queue.enqueue({ key, value });
      this._debouncedQueue();
      return;
    }

    this._db.set(key, new StorageProperty(driver, key, value, this._prefix));
  }

  /**
   * Archive the property and remove it from the in-memory map so a later
   * {@link set} can recreate the key.
   */
  remove(key: string): void {
    this._db.get(key)?.remove();
    this._db.delete(key);
  }

  /**
   * Archive and drop properties. If `driver` is set, only matching drivers
   * are cleared.
   */
  clear(driver?: StorageDriver): void {
    for (const [key, property] of this._db) {
      if (driver && property.driverType !== driver) continue;

      property.remove();
      this._db.delete(key);
    }
  }

  private _processQueue(): void {
    this._queue.process(({ key, value }) => {
      const property = this._db.get(key);
      if (property) property.value = value;
    });
  }
}

export type { StorageDriver };

export default WebStorage;
