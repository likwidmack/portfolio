import { ErrorCodes, MediaPlayerError } from '../errors.js';
import { getMseConstructor, isMseSupported } from './mse-capability.js';
import { SourceBufferQueue } from './source-buffer-queue.js';

/** Options for {@link MediaSourceEngine}. */
export interface MediaSourceEngineOptions {
  /** MIME string passed to `addSourceBuffer` / `isTypeSupported`. */
  mimeType?: string;
  /** Invoked when the append queue reports an error. */
  onError?: (error: Error) => void;
}

const DEFAULT_MIME = 'video/mp4; codecs="avc1.42E01E,mp4a.40.2"';

/**
 * Owns `MediaSource` / `ManagedMediaSource` lifecycle and a serialized
 * {@link SourceBufferQueue} for video appends.
 *
 * Loaders call {@link open}, {@link appendVideo}, and {@link endOfStream};
 * they never attach MediaSource themselves.
 */
export class MediaSourceEngine {
  private mediaSource: MediaSource | null = null;
  private objectUrl: string | null = null;
  private videoBuffer: SourceBuffer | null = null;
  private queue: SourceBufferQueue | null = null;
  private destroyed = false;

  constructor(
    private readonly video: HTMLVideoElement,
    private readonly options: MediaSourceEngineOptions = {}
  ) {}

  /** True when the underlying MediaSource is in the `open` readyState. */
  get isOpen(): boolean {
    return this.mediaSource?.readyState === 'open';
  }

  /**
   * Create MediaSource, attach an object URL to `video`, and add a SourceBuffer
   * after `sourceopen`.
   */
  async open(): Promise<void> {
    if (this.destroyed) {
      throw new MediaPlayerError(ErrorCodes.DESTROYED, 'Engine destroyed');
    }
    const mimeType = this.options.mimeType ?? DEFAULT_MIME;
    if (!isMseSupported(mimeType)) {
      throw new MediaPlayerError(ErrorCodes.MSE_UNSUPPORTED, `MIME not supported: ${mimeType}`);
    }
    const MSE = getMseConstructor();
    if (!MSE) {
      throw new MediaPlayerError(ErrorCodes.MSE_UNSUPPORTED, 'MediaSource API unavailable');
    }

    await this.reset();
    const mediaSource = new MSE();
    this.mediaSource = mediaSource;

    await new Promise<void>((resolve, reject) => {
      const onOpen = () => {
        mediaSource.removeEventListener('sourceopen', onOpen);
        try {
          this.videoBuffer = mediaSource.addSourceBuffer(mimeType);
          this.queue = new SourceBufferQueue(
            () => this.videoBuffer,
            (error) => this.options.onError?.(error)
          );
          resolve();
        } catch (error) {
          reject(error);
        }
      };
      mediaSource.addEventListener('sourceopen', onOpen);
      this.objectUrl = URL.createObjectURL(mediaSource);
      this.video.src = this.objectUrl;
    });
  }

  /** Enqueue an fMP4 (or remuxed) chunk for the video SourceBuffer. */
  appendVideo(data: Uint8Array): void {
    this.queue?.enqueue('video', data);
  }

  /** Drain the append queue, then call `MediaSource.endOfStream()` when open. */
  async endOfStream(): Promise<void> {
    if (!this.mediaSource || this.mediaSource.readyState !== 'open') {
      return;
    }
    if (this.queue) {
      await this.queue.drain();
    }
    try {
      this.mediaSource.endOfStream();
    } catch {
      // ignore if already ended
    }
  }

  /** Abort the queue, revoke the object URL, and clear `video.src`. */
  async reset(): Promise<void> {
    this.queue?.destroy();
    this.queue = null;
    this.videoBuffer = null;
    if (this.mediaSource) {
      try {
        if (this.mediaSource.readyState === 'open') {
          this.mediaSource.endOfStream();
        }
      } catch {
        // ignore
      }
      this.mediaSource = null;
    }
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
    this.video.removeAttribute('src');
    this.video.load();
  }

  /** Permanent teardown. Safe to call more than once. */
  destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.destroyed = true;
    void this.reset();
  }
}
