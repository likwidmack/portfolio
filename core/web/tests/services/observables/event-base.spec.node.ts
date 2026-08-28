import { afterEach, describe, expect, it, vi } from 'vitest';
import { EventBase, EventHandler } from '~~/services/observables/event-base';

describe('EventHandler', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('applies default scope and forwards EventInit', () => {
    const received: Event[] = [];
    const listener = (e: Event) => received.push(e);
    document.addEventListener('event-base-unit', listener);

    const ev = new EventHandler('event-base-unit', {
      bubbles: true,
      cancelable: true,
      scope: 'unit-scope',
    });

    expect(ev.type).toBe('event-base-unit');
    expect(ev.scope).toBe('unit-scope');
    expect(ev.bubbles).toBe(true);
    expect(ev.cancelable).toBe(true);
    expect(received).toHaveLength(1);
    expect(received[0]).toBe(ev);

    document.removeEventListener('event-base-unit', listener);
  });

  it('uses global scope when init is omitted', () => {
    const received: Event[] = [];
    const listener = (e: Event) => received.push(e);
    document.addEventListener('event-base-default-scope', listener);
    const ev = new EventHandler('event-base-default-scope');
    expect(ev.scope).toBe('global');
    expect(received).toHaveLength(1);
    document.removeEventListener('event-base-default-scope', listener);
  });
});

describe('EventBase', () => {
  it('registers listeners, dispatches, and removes', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const bus = new EventBase();
    const fn = vi.fn();
    bus.on('tick', fn);
    const evt = new Event('tick');
    bus.dispatch('tick', evt);
    expect(fn).toHaveBeenCalledWith(evt);

    bus.off('tick', fn);
    bus.dispatch('tick', evt);
    expect(fn).toHaveBeenCalledTimes(1);
    log.mockRestore();
  });

  it('add/remove mirror on/off', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const bus = new EventBase();
    const fn = vi.fn();
    bus.add('x', fn);
    bus.dispatch('x', new Event('x'));
    expect(fn).toHaveBeenCalledTimes(1);
    bus.remove('x', fn);
    bus.dispatch('x', new Event('x'));
    expect(fn).toHaveBeenCalledTimes(1);
    log.mockRestore();
  });

  it('removeAll clears type', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const bus = new EventBase();
    const fn = vi.fn();
    bus.on('z', fn);
    bus.removeAll('z');
    bus.dispatch('z', new Event('z'));
    expect(fn).not.toHaveBeenCalled();
    log.mockRestore();
  });
});
