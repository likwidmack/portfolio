import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MediaSourceEngine } from '../../src/lib/engine/media-source-engine.js';

class MockMediaSource extends EventTarget {
  static isTypeSupported = vi.fn(() => true);
  readyState: 'closed' | 'open' | 'ended' = 'closed';

  constructor() {
    super();
    queueMicrotask(() => {
      this.readyState = 'open';
      this.dispatchEvent(new Event('sourceopen'));
    });
  }

  addSourceBuffer() {
    const emitter = new EventEmitter();
    return {
      appendBuffer: vi.fn(),
      addEventListener: (type: string, listener: EventListener) => {
        emitter.on(type, listener as (...args: unknown[]) => void);
      },
      removeEventListener: (type: string, listener: EventListener) => {
        emitter.off(type, listener as (...args: unknown[]) => void);
      },
    } as unknown as SourceBuffer;
  }

  endOfStream(): void {
    this.readyState = 'ended';
  }
}

describe('MediaSourceEngine', () => {
  const originalMSE = globalThis.MediaSource;
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;

  beforeEach(() => {
    globalThis.MediaSource = MockMediaSource as unknown as typeof MediaSource;
    URL.createObjectURL = vi.fn(() => 'blob:mock');
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    globalThis.MediaSource = originalMSE;
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevoke;
    vi.restoreAllMocks();
  });

  it('opens MediaSource and attaches blob URL to video', async () => {
    const video = {
      src: '',
      removeAttribute: vi.fn(),
      load: vi.fn(),
    } as unknown as HTMLVideoElement;

    const engine = new MediaSourceEngine(video);
    await engine.open();

    expect(engine.isOpen).toBe(true);
    expect(video.src).toBe('blob:mock');
  });

  it('destroy is idempotent', async () => {
    const video = {
      src: '',
      removeAttribute: vi.fn(),
      load: vi.fn(),
    } as unknown as HTMLVideoElement;

    const engine = new MediaSourceEngine(video);
    await engine.open();
    engine.destroy();
    engine.destroy();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock');
  });
});
