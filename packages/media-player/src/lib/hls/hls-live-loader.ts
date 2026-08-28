import { MediaSourceEngine } from '../engine/media-source-engine.js';
import type { LoaderContext, PlaybackLoader } from '../loaders/playback-loader.js';
import type { MediaAssetInput } from '../types.js';
import { fetchManifestText, parseMediaPlaylist } from './playlist-parser.js';
import { fetchBuffer } from './segment-fetcher.js';
import { needsTransmux, transmuxTsToFmp4 } from './transmuxer.js';

/**
 * Live HLS loader: join the sliding window, poll the media playlist, and append
 * only newly seen sequence indices.
 *
 * v1 limits: ~4s poll, best-effort discontinuity handling, no full DVR UI.
 */
export class HlsLiveLoader implements PlaybackLoader {
  readonly mode = 'mse-hls' as const;
  private abort: AbortController | null = null;
  private destroyed = false;
  private engine: MediaSourceEngine | null = null;
  /** Absolute segment URIs already appended (sliding-window de-dupe). */
  private readonly seenSegmentUris = new Set<string>();
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly ctx: LoaderContext) {}

  /** Open MSE, perform an initial poll, then refresh on an interval. */
  async load(asset: MediaAssetInput): Promise<void> {
    if (this.destroyed) {
      return;
    }
    this.abort?.abort();
    this.abort = new AbortController();
    const signal = this.abort.signal;
    this.ctx.onPlaybackMode('mse-hls');

    this.engine = new MediaSourceEngine(this.ctx.video, {});
    await this.engine.open();

    const poll = async () => {
      if (signal.aborted || this.destroyed) {
        return;
      }
      const media = parseMediaPlaylist(await fetchManifestText(asset.url, signal), asset.url);
      for (const segment of media.segments) {
        if (this.seenSegmentUris.has(segment.uri)) {
          continue;
        }
        let data = await fetchBuffer(segment.uri, signal);
        if (needsTransmux(segment.uri)) {
          data = transmuxTsToFmp4(data);
        }
        this.engine?.appendVideo(data);
        this.seenSegmentUris.add(segment.uri);
      }
    };

    await poll();
    this.pollTimer = setInterval(() => {
      void poll().catch(() => undefined);
    }, 4000);
  }

  destroy(): void {
    this.destroyed = true;
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.abort?.abort();
    this.engine?.destroy();
    this.engine = null;
  }
}
