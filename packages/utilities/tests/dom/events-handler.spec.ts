// @vitest-environment jsdom

import { EventsHandler } from '../../src/lib/dom/events-handler.js';

describe('DOM EventsHandler', () => {
  it('isolates listeners per instance', () => {
    const a = new EventsHandler();
    const b = new EventsHandler();
    const cb = vi.fn();
    a.on('ping', cb);
    b.dispatch('ping', new Event('ping'));
    expect(cb).not.toHaveBeenCalled();
  });

  it('add/remove alias on/off', () => {
    const h = new EventsHandler();
    const cb = vi.fn();
    h.add('click', cb);
    h.dispatch('click', new Event('click'));
    expect(cb).toHaveBeenCalledTimes(1);
    h.remove('click', cb);
    h.dispatch('click', new Event('click'));
    expect(cb).toHaveBeenCalledTimes(1);
  });
});
