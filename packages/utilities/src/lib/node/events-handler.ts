/**
 * Node event helpers for `@tgmc/utilities` (default entry).
 *
 * `EventsHandler` keeps a **per-instance** listener map (instances do not share
 * listeners). For DOM / `CustomEvent`, use `@tgmc/utilities/browser`.
 */
import { EventEmitter } from 'node:events';

type EventType = string | Event;
type EventCallback = (event: Event) => void;
type CustomEventProps = EventInit & {
  scope?: string;
  platform?: string;
};

/**
 * Named event type that extends Node's `EventEmitter`.
 */
export class EventHandler extends EventEmitter {
  scope: string;
  type: string;

  /**
   * @param type - Event type name
   * @param init - Optional `scope` and EventInit-like fields
   */
  constructor(type: string, init?: CustomEventProps) {
    const { scope } = init ?? {};
    super();
    this.type = type;
    Object.defineProperties(this, {
      scope: { get: () => scope },
    });

    this.scope = scope || 'global';
  }
}

/**
 * Simple typed pub/sub with an isolated listener store per instance.
 */
export class EventsHandler {
  private _events = new Map<EventType, EventCallback[]>();

  /** Register `callback` for `eventType`. */
  on(eventType: EventType, callback: EventCallback) {
    const list = this._events.get(eventType) ?? [];
    list.push(callback);
    this._events.set(eventType, list);
  }

  /** Remove a previously registered `callback` for `eventType` (no-op if absent). */
  off(eventType: EventType, callback: EventCallback) {
    const list = this._events.get(eventType);
    if (!list) return;
    this._events.set(
      eventType,
      list.filter((cb) => cb !== callback)
    );
  }

  /** Invoke all listeners for `eventType` with `event` (snapshot iteration). */
  dispatch(eventType: EventType, event: Event) {
    const list = this._events.get(eventType);
    if (!list) return;
    for (const cb of [...list]) cb(event);
  }

  /**
   * Clear listeners.
   * - `true`, `'all'`, or `'*'` — wipe the entire store
   * - string event type — empty that type's list
   * - falsy — no-op
   */
  clear(eventOrAll: EventType | boolean) {
    if (!eventOrAll) return;
    if (eventOrAll === true || eventOrAll === 'all' || eventOrAll === '*') {
      this._events.clear();
      return;
    }
    if (typeof eventOrAll === 'string') this._events.set(eventOrAll, []);
  }
}

export default EventsHandler;
