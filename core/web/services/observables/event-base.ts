/**
 * Lightweight pub/sub hub plus DOM-oriented event scaffolding.
 *
 * {@link EventBase} tracks named listener sets per instance; {@link EventHandler}
 * emits a synthetic lifecycle event when constructed so creation can be observed globally.
 */

export const Platform = {
  Application: 'application',
  Any: 'any',
  Browser: 'browser',
  Node: 'node',
  Worker: 'worker',
} as const;

export type Platform = (typeof Platform)[keyof typeof Platform];

export const Scope = {
  Action: 'action',
  Analytics: 'analytics',
  Data: 'data',
  DOM: 'dom',
  Global: 'global',
} as const;

export type Scope = (typeof Scope)[keyof typeof Scope];

export interface EventHandlerInit extends EventInit {
  scope?: string;
}

// Parameter names document the listener argument for implementers.
/* eslint-disable no-unused-vars -- callable interface signatures */
export interface EventBaseCallback {
  (event: Event): void;
}

interface DomEventCallback {
  (event: CustomEvent): void;
}

interface DomEventObjectProps extends EventInit {
  scope?: Scope;
  platform?: Platform;
  detail?: any;
}

const scopeDef = Scope.Global;
const platformDef = Platform.Any;
const eventStore = new Map<string, Set<DomEventObject>>();
const existingEventTypes = Object.create(null) as Record<string, string>;

/** Dispatches itself on `document` when constructed so listeners can observe creation. */
export class EventHandler extends Event {
  readonly scope: string;

  constructor(type: string, init?: EventHandlerInit) {
    const { scope = Scope.Global, ...eventInit } = init ?? {};
    super(type, eventInit);
    this.scope = scope;
    if (typeof document !== 'undefined') {
      document.dispatchEvent(this);
    }
  }
}

class DomEventObject {
  declare readonly platform: string;
  declare readonly scope: string;

  protected event: CustomEvent;
  protected callbacks: Set<DomEventCallback> = new Set();
  public domElement?: Element | Document | Window;

  constructor(type: string, init?: DomEventObjectProps) {
    const { scope = scopeDef, platform = platformDef, ...eventInitDict } = init ?? {};

    if (!eventInitDict.detail) eventInitDict.detail = {};
    this.event = new CustomEvent(type, eventInitDict);

    Object.defineProperties(this, {
      scope: { get: () => scope },
      platform: { get: () => platform },
    });

    if (scope === Scope.DOM) {
      this.domElement = document;
    }
  }

  get detail(): any {
    return this.event.detail;
  }

  trigger() {
    if (this.domElement) return;
    for (const cb of this.callbacks) {
      cb(this.event);
    }
  }

  setDomElement(element: Element | Document | Window) {
    this.domElement = element;
  }

  addCallback(callback: DomEventCallback) {
    this.callbacks.add(callback);
  }

  removeCallback(callback: DomEventCallback) {
    this.callbacks.delete(callback);
  }

  removeAllCallbacks() {
    this.callbacks.clear();
  }
}

/** In-memory event bus keyed by string `eventType`; optional platform hint primes DOM stubs in non-browser hosts. */
export class EventBase {
  private readonly _handlers = new Map<string, Set<EventBaseCallback>>();
  public readonly platform: Platform;

  /**
   * @param platform - Runtime platform marker forwarded to DOM event bootstrapping (see {@link setDomEvents}).
   */
  constructor(platform?: Platform) {
    this.platform = platform ?? platformDef;
    setDomEvents(this.platform !== platformDef ? Platform.Browser : this.platform);
  }

  /** Synchronously notifies every subscriber registered with `eventType`. */
  dispatch(eventType: string, event: Event): void {
    const set = this._handlers.get(eventType);
    if (!set?.size) {
      console.log(`Event type ${eventType} does not exist.`);
      return;
    }
    for (const cb of set) {
      cb(event);
    }
  }

  /** Subscribe to `eventType` (duplicate callbacks allowed). */
  on(eventType: string, callback: EventBaseCallback): void {
    let set = this._handlers.get(eventType);
    if (!set) {
      set = new Set();
      this._handlers.set(eventType, set);
    }
    set.add(callback);
  }

  /** Unsubscribe `callback` from `eventType` if present. */
  off(eventType: string, callback: EventBaseCallback): void {
    this._handlers.get(eventType)?.delete(callback);
  }

  add(eventType: string, callback: EventBaseCallback): void {
    this.on(eventType, callback);
  }

  remove(eventType: string, callback: EventBaseCallback): void {
    this.off(eventType, callback);
  }

  removeAll(eventType?: string): void {
    if (eventType) {
      this._handlers.delete(eventType);
      return;
    }
    this._handlers.clear();
  }
}

export default EventBase;

/**
 * When neither `window` nor `document` exist, registers placeholder `DomEventObject` buckets for each known
 * `"on*" ` key on `document`/`window`. No-op under real browsers (`window.document` assumed available).
 *
 * Intended for SSR / non-DOM runners that still load this module shape.
 */
function setDomEvents(platform: Platform) {
  try {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') return;
    const addEventType = (eventType: string) => {
      const name = eventType.slice(2);

      if (name in existingEventTypes) return null;

      Object.defineProperty(existingEventTypes, name, {
        enumerable: true,
        configurable: false,
        writable: false,
        value: eventType,
      });

      const _event = new DomEventObject(name, { scope: Scope.DOM, platform });
      eventStore.set(name, new Set([_event]));

      return _event;
    };

    const documentEventTypes = Object.keys(document).filter((key) => key.startsWith('on'));
    for (const eventType of documentEventTypes) {
      const _evt = addEventType(eventType);
      _evt?.setDomElement(document);
    }

    const windowEventTypes = Object.keys(window).filter((key) => key.startsWith('on'));
    for (const eventType of windowEventTypes) {
      const _evt = addEventType(eventType);
      _evt?.setDomElement(window);
    }
  } catch (error) {
    console.error(error);
  }
}
