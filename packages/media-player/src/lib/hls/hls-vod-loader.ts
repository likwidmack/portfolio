import { MediaSourceEngine } from '../engine/media-source-engine.js';
import type { LoaderContext, PlaybackLoader } from '../loaders/playback-loader.js';
import type { LevelInfo, MediaAssetInput } from '../types.js';
import { fetchManifestText, parseMasterPlaylist, parseMediaPlaylist, type ParsedVariant } from './playlist-parser.js';
import { fetchBuffer } from './segment-fetcher.js';
import { needsTransmux, transmuxTsToFmp4 } from './transmuxer.js';

/**
 * HLS VOD loader: parse master/media playlists, fetch segments, optional TS→fMP4
 * transmux, append via owned {@link MediaSourceEngine}.
 *
 * Prefer fMP4/CMAF segments; transmux only when segment URIs look like MPEG-TS.
 * Native HLS fallback is orchestrated by {@link TgmcPlayer}, not this class.
 */
export class HlsVodLoader implements PlaybackLoader {
  readonly mode = 'mse-hls' as const;
  private abort: AbortController | null = null;
  private destroyed = false;
  private variants: ParsedVariant[] = [];
  private levelIndex = 0;
  private engine: MediaSourceEngine | null = null;

  constructor(
    private readonly ctx: LoaderContext,
    private readonly onLevelChange?: (level: LevelInfo) => void
  ) {}

  /**
   * Open MSE, resolve the first (or only) variant, append all segments, then
   * {@link MediaSourceEngine.endOfStream}.
   */
  async load(asset: MediaAssetInput): Promise<void> {
    if (this.destroyed) {
      return;
    }
    this.abort?.abort();
    this.abort = new AbortController();
    const signal = this.abort.signal;
    this.ctx.onPlaybackMode('mse-hls');

    this.engine = new MediaSourceEngine(this.ctx.video, {
      onError: (error) => {
        throw error;
      },
    });
    await this.engine.open();

    const manifestText = await fetchManifestText(asset.url, signal);
    let mediaUrl = asset.url;
    this.variants = parseMasterPlaylist(manifestText, asset.url);
    if (this.variants.length > 0) {
      this.levelIndex = 0;
      mediaUrl = this.variants[this.levelIndex].url;
      this.emitLevel();
    }

    const media = parseMediaPlaylist(await fetchManifestText(mediaUrl, signal), mediaUrl);
    for (const segment of media.segments) {
      if (signal.aborted) {
        return;
      }
      let data = await fetchBuffer(segment.uri, signal);
      if (needsTransmux(segment.uri)) {
        data = transmuxTsToFmp4(data);
      }
      this.engine.appendVideo(data);
    }
    await this.engine.endOfStream();
  }

  /**
   * Record a manual level selection and emit `levelchange`.
   * Full mid-stream variant reload is deferred (v1.1).
   */
  setLevel(index: number): void {
    if (index < 0 || index >= this.variants.length) {
      return;
    }
    this.levelIndex = index;
    this.emitLevel();
    // Full variant switch reload is v1.1; manual API records intent for M3.
  }

  private emitLevel(): void {
    const variant = this.variants[this.levelIndex];
    if (!variant) {
      return;
    }
    this.onLevelChange?.({
      index: this.levelIndex,
      bandwidth: variant.bandwidth,
      height: variant.resolution?.height,
      url: variant.url,
    });
  }

  destroy(): void {
    this.destroyed = true;
    this.abort?.abort();
    this.engine?.destroy();
    this.engine = null;
  }
}
