import type { MediaAssetInput } from '../types.js';
import type { LoaderContext, PlaybackLoader } from './playback-loader.js';

/**
 * Progressive MP4 (and similar) loader using `video.src` + `load()`.
 * Does not open MediaSource — that path is reserved for HLS.
 */
export class ProgressiveLoader implements PlaybackLoader {
  readonly mode = 'progressive' as const;
  private abort: AbortController | null = null;
  private destroyed = false;

  constructor(
    private readonly ctx: LoaderContext,
    private readonly onLoaded?: () => void
  ) {}

  /** Assign `asset.url` and resolve on `canplay` (or reject on `error` / abort). */
  async load(asset: MediaAssetInput): Promise<void> {
    if (this.destroyed) {
      return;
    }
    this.abort?.abort();
    this.abort = new AbortController();
    this.ctx.onPlaybackMode('progressive');
    this.ctx.video.src = asset.url;
    this.ctx.video.load();
    await new Promise<void>((resolve, reject) => {
      const signal = this.abort?.signal;
      const onCanPlay = () => {
        cleanup();
        this.onLoaded?.();
        resolve();
      };
      const onError = () => {
        cleanup();
        reject(new Error('Progressive load failed'));
      };
      const cleanup = () => {
        this.ctx.video.removeEventListener('canplay', onCanPlay);
        this.ctx.video.removeEventListener('error', onError);
        signal?.removeEventListener('abort', onAbort);
      };
      const onAbort = () => {
        cleanup();
        reject(new DOMException('Aborted', 'AbortError'));
      };
      this.ctx.video.addEventListener('canplay', onCanPlay);
      this.ctx.video.addEventListener('error', onError);
      signal?.addEventListener('abort', onAbort);
    });
  }

  destroy(): void {
    this.destroyed = true;
    this.abort?.abort();
    this.abort = null;
  }
}
