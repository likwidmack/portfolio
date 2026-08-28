import { describe, expect, it, vi } from 'vitest';

import { PlayerEventBus } from '../../src/lib/events/player-event-bus.js';

describe('PlayerEventBus', () => {
  it('subscribes and emits typed payloads', () => {
    const bus = new PlayerEventBus();
    const handler = vi.fn();
    bus.on('playbackmodechange', handler);
    bus.emit('playbackmodechange', { mode: 'mse-hls' });
    expect(handler).toHaveBeenCalledWith({ mode: 'mse-hls' });
  });

  it('unsubscribes via returned disposer', () => {
    const bus = new PlayerEventBus();
    const handler = vi.fn();
    const off = bus.on('play', handler);
    off();
    bus.emit('play', undefined);
    expect(handler).not.toHaveBeenCalled();
  });
});
