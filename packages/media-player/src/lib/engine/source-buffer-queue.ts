/** Which SourceBuffer track an append targets. */
export type BufferKind = 'video' | 'audio';

/** One pending `appendBuffer` operation. */
export interface QueuedAppend {
  bufferKind: BufferKind;
  data: Uint8Array;
}

/**
 * Serializes `SourceBuffer.appendBuffer` calls until each `updateend`.
 *
 * MSE only allows one append in flight per buffer; this queue prevents
 * `InvalidStateError` when loaders enqueue segments faster than the browser drains.
 */
export class SourceBufferQueue {
  private readonly queue: QueuedAppend[] = [];
  private draining = false;
  private destroyed = false;

  constructor(
    private readonly getBuffer: (kind: BufferKind) => SourceBuffer | null,
    private readonly onError: (error: Error) => void
  ) {}

  /** Push a chunk and kick the drain loop. No-ops after {@link destroy}. */
  enqueue(kind: BufferKind, data: Uint8Array): void {
    if (this.destroyed) {
      return;
    }
    this.queue.push({ bufferKind: kind, data });
    void this.drain();
  }

  /** Process the queue sequentially; re-enters if items arrive mid-drain. */
  async drain(): Promise<void> {
    if (this.draining || this.destroyed) {
      return;
    }
    this.draining = true;
    try {
      while (this.queue.length > 0 && !this.destroyed) {
        const next = this.queue[0];
        const buffer = this.getBuffer(next.bufferKind);
        if (!buffer) {
          throw new Error(`Missing SourceBuffer for ${next.bufferKind}`);
        }
        await this.appendWhenReady(buffer, next.data);
        this.queue.shift();
      }
    } catch (error) {
      this.onError(error instanceof Error ? error : new Error(String(error)));
    } finally {
      this.draining = false;
      if (this.queue.length > 0 && !this.destroyed) {
        void this.drain();
      }
    }
  }

  /** Drop pending appends without destroying the queue. */
  clear(): void {
    this.queue.length = 0;
  }

  /** Stop accepting appends and clear the queue. */
  destroy(): void {
    this.destroyed = true;
    this.clear();
  }

  private appendWhenReady(buffer: SourceBuffer, data: Uint8Array): Promise<void> {
    return new Promise((resolve, reject) => {
      const onUpdateEnd = () => {
        buffer.removeEventListener('updateend', onUpdateEnd);
        buffer.removeEventListener('error', onError);
        resolve();
      };
      const onError = () => {
        buffer.removeEventListener('updateend', onUpdateEnd);
        buffer.removeEventListener('error', onError);
        reject(new Error('SourceBuffer append failed'));
      };
      buffer.addEventListener('updateend', onUpdateEnd);
      buffer.addEventListener('error', onError);
      try {
        buffer.appendBuffer(data as BufferSource);
      } catch (error) {
        buffer.removeEventListener('updateend', onUpdateEnd);
        buffer.removeEventListener('error', onError);
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }
}
