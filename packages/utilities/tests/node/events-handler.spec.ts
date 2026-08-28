import { EventsHandler } from '../../src/lib/node/events-handler.js';

describe('Node EventsHandler', () => {
  it('isolates listeners per instance', () => {
    const a = new EventsHandler();
    const b = new EventsHandler();
    const cb = vi.fn();
    a.on('ping', cb);
    b.dispatch('ping', { type: 'ping' } as Event);
    expect(cb).not.toHaveBeenCalled();
    a.dispatch('ping', { type: 'ping' } as Event);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('off removes only the matching callback', () => {
    const h = new EventsHandler();
    const a = vi.fn();
    const b = vi.fn();
    h.on('x', a);
    h.on('x', b);
    h.off('x', a);
    h.dispatch('x', { type: 'x' } as Event);
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('clear(true) clears all', () => {
    const h = new EventsHandler();
    const cb = vi.fn();
    h.on('y', cb);
    h.clear(true);
    h.dispatch('y', { type: 'y' } as Event);
    expect(cb).not.toHaveBeenCalled();
  });
});
