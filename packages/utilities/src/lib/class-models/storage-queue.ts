/**
 * A generic queue that drains one item per macrotask (`setTimeout(0)`),
 * yielding to the event loop between items.
 *
 * `clear()` bumps an internal generation so already-scheduled drains no-op
 * and cannot steal items from a later {@link StorageQueue.process} cycle.
 *
 * @template T Item type
 */
export class StorageQueue<T = any> {
  protected _queue: T[];
  private _isProcessing = false;
  /** Bumped on clear() and when starting process(); stale scheduled drains no-op. */
  private _drainGeneration = 0;

  /** @param queue - Optional initial items */
  constructor(queue: T[] = []) {
    this._queue = queue;
  }

  /** Append an item. */
  enqueue(item: T): void {
    this._queue.push(item);
  }

  /** Remove and return the oldest item, or `undefined`. */
  dequeue(): T | undefined {
    return this._queue.shift();
  }

  /** Peek at the oldest item without removing it. */
  peek(): T | undefined {
    return this._queue[0];
  }

  /**
   * Drain the queue by invoking `callback` once per item, scheduling each
   * next step on a macrotask. No-op if already processing or empty.
   */
  process(callback: (item: T) => void): void {
    if (this._isProcessing || this.length === 0) return;

    this._isProcessing = true;
    const generation = ++this._drainGeneration;
    this._drain(callback, generation);
  }

  private _drain(callback: (item: T) => void, generation: number): void {
    if (generation !== this._drainGeneration) return;

    if (this.length === 0) {
      this._isProcessing = false;
      return;
    }

    const item = this.dequeue();
    if (item !== undefined) callback(item);

    setTimeout(() => this._drain(callback, generation), 0);
  }

  /** Pending item count. */
  get length(): number {
    return this._queue.length;
  }

  /**
   * Empty the queue and invalidate in-flight drains so a subsequent
   * {@link process} cannot be corrupted by stale timers.
   */
  clear(): void {
    this._queue = [];
    this._drainGeneration++;
    this._isProcessing = false;
  }
}

export default StorageQueue;
