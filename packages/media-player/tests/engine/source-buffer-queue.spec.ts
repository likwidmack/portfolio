import { EventEmitter } from 'node:events';
import { describe, expect, it, vi } from 'vitest';

import { SourceBufferQueue } from '../../src/lib/engine/source-buffer-queue.js';

function createMockSourceBuffer(): SourceBuffer {
  const emitter = new EventEmitter();
  return {
    appendBuffer: vi.fn(() => {
      queueMicrotask(() => emitter.emit('updateend'));
    }),
    addEventListener: (type: string, listener: EventListener) => {
      emitter.on(type, listener as (...args: unknown[]) => void);
    },
    removeEventListener: (type: string, listener: EventListener) => {
      emitter.off(type, listener as (...args: unknown[]) => void);
    },
  } as unknown as SourceBuffer;
}

describe('SourceBufferQueue', () => {
  it('appends queued chunks in order', async () => {
    const buffer = createMockSourceBuffer();
    const appended: Uint8Array[] = [];
    const queue = new SourceBufferQueue(
      () => buffer,
      () => undefined
    );
    const appendSpy = buffer.appendBuffer as ReturnType<typeof vi.fn>;

    queue.enqueue('video', new Uint8Array([1]));
    queue.enqueue('video', new Uint8Array([2]));
    await new Promise<void>((resolve) => {
      queueMicrotask(() => resolve());
    });
    await queue.drain();

    expect(appendSpy).toHaveBeenCalledTimes(2);
    appended.push(appendSpy.mock.calls[0][0] as Uint8Array);
    appended.push(appendSpy.mock.calls[1][0] as Uint8Array);
    expect(appended[0][0]).toBe(1);
    expect(appended[1][0]).toBe(2);
  });

  it('ignores enqueue after destroy', async () => {
    const buffer = createMockSourceBuffer();
    const queue = new SourceBufferQueue(
      () => buffer,
      () => undefined
    );
    queue.destroy();
    queue.enqueue('video', new Uint8Array([1]));
    await queue.drain();
    expect(buffer.appendBuffer).not.toHaveBeenCalled();
  });
});
