/**
 * DOM event helpers for `@tgmc/utilities/browser`.
 *
 * `EventsHandler` keeps a **per-instance** listener map. `EventHandler` is a
 * `CustomEvent` that dispatches on `document` when constructed in a browser.
 */

type EventType = string | Event;
type EventCallback = (event: Event) => void;
type CustomEventProps = EventInit & {
  scope?: string;
  platform?: string;
};

/**
 * Browser `CustomEvent` that optionally auto-dispatches on `document`.
 */
export class EventHandler extends CustomEvent<unknown> {
  scope: string;

  /**
   * @param type - Event type name
   * @param init - Optional `scope` plus standard `EventInit` fields
   */
  constructor(type: string, init?: CustomEventProps) {
    const { scope, ...eventInitDict } = init ?? {};
    super(type, eventInitDict);
    Object.defineProperties(this, {
      scope: { get: () => scope },
    });

    this.scope = scope || 'global';

    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      document.dispatchEvent(this);
    }
  }
}

/**
 * Simple typed pub/sub with an isolated listener store per instance.
 * `add` / `remove` / `removeAll` alias `on` / `off` / delete-type.
 */
export class EventsHandler {
  private _events = new Map<EventType, EventCallback[]>();

  /** Register `callback` for `eventType`. */
  on(eventType: EventType, callback: EventCallback) {
    const list = this._events.get(eventType) ?? [];
    list.push(callback);
    this._events.set(eventType, list);
  }

  /** Remove a previously registered `callback` (no-op if absent). */
  off(eventType: EventType, callback: EventCallback) {
    const list = this._events.get(eventType);
    if (!list) return;
    this._events.set(
      eventType,
      list.filter((cb) => cb !== callback)
    );
  }

  /** Invoke all listeners for `eventType` (snapshot iteration). */
  dispatch(eventType: EventType, event: Event) {
    const list = this._events.get(eventType);
    if (!list) return;
    for (const cb of [...list]) cb(event);
  }

  /** Alias of {@link EventsHandler.on}. */
  add(eventType: EventType, callback: EventCallback) {
    this.on(eventType, callback);
  }

  /** Alias of {@link EventsHandler.off}. */
  remove(eventType: EventType, callback: EventCallback) {
    this.off(eventType, callback);
  }

  /** Remove all callbacks for a single `eventType`. */
  removeAll(eventType: EventType) {
    this._events.delete(eventType);
  }
}

export default EventsHandler;
