import { AdCueScheduler } from '../domain/ad-cue.js';
import { MediaAsset } from '../domain/media-asset.js';
import { Playlist, createPlaylist } from '../domain/playlist.js';
import { attachTextTracks, clearTextTracks } from '../domain/text-tracks.js';
import { isMseSupported } from '../engine/mse-capability.js';
import { ErrorCodes, MediaPlayerError } from '../errors.js';
import { PlayerEventBus } from '../events/player-event-bus.js';
import { HlsLiveLoader } from '../hls/hls-live-loader.js';
import { HlsVodLoader } from '../hls/hls-vod-loader.js';
import type { LoaderContext, PlaybackLoader } from '../loaders/playback-loader.js';
import { ProgressiveLoader } from '../loaders/progressive-loader.js';
import type { MediaAssetInput, PlaybackMode, PlaylistInput, TgmcPlayerOptions } from '../types.js';

/**
 * Integrator-facing player facade.
 *
 * Owns loader selection (progressive / HLS VOD / live), playlist continuous play,
 * ad-cue hooks, WebVTT track attachment, and Safari native-HLS fallback when MSE
 * cannot open for `.m3u8` assets.
 *
 * @example
 * ```ts
 * const player = new TgmcPlayer(video);
 * player.on('playbackmodechange', ({ mode }) => console.log(mode));
 * await player.load({ url: '/clip.mp4', kind: 'progressive' });
 * await player.play();
 * ```
 */
export class TgmcPlayer {
  private readonly events = new PlayerEventBus();
  private readonly video: HTMLVideoElement;
  private readonly options: TgmcPlayerOptions;
  private loader: PlaybackLoader | null = null;
  private playlist: Playlist | null = null;
  private adScheduler: AdCueScheduler;
  private destroyed = false;
  private abortLoad: AbortController | null = null;
  private playbackMode: PlaybackMode = 'progressive';

  /**
   * @param video - Host `<video>` element (sets `playsInline` for Safari/iOS)
   * @param options - Optional autoplay and buffer tuning
   */
  constructor(video: HTMLVideoElement, options: TgmcPlayerOptions = {}) {
    this.video = video;
    this.options = options;
    this.video.playsInline = true;
    this.adScheduler = new AdCueScheduler(
      this.video,
      (cue) => this.events.emit('adcueenter', { cue }),
      (cue) => this.events.emit('adcueexit', { cue })
    );
    this.bindVideoEvents();
  }

  /** Subscribe to a typed player event; returns an unsubscribe function. */
  on = this.events.on.bind(this.events);

  /** Load a single asset and replace any current loader. */
  async load(assetInput: MediaAssetInput): Promise<void> {
    const asset = new MediaAsset(assetInput);
    await this.loadAsset(asset, 0);
  }

  /**
   * Load a playlist and start at `startIndex` (or `0`).
   * With `continuousPlay`, advances automatically on `ended`.
   */
  async loadPlaylist(input: PlaylistInput): Promise<void> {
    this.playlist = createPlaylist(input);
    const current = this.playlist.current();
    if (!current) {
      throw new MediaPlayerError(ErrorCodes.INVALID_ASSET, 'Playlist is empty');
    }
    await this.loadAsset(current, this.playlist.currentIndex());
  }

  /** Resume or start playback on the media element. */
  async play(): Promise<void> {
    await this.video.play();
    this.events.emit('play', undefined);
  }

  /** Pause the media element. */
  pause(): void {
    this.video.pause();
    this.events.emit('pause', undefined);
  }

  /**
   * Seek to `seconds`, clamped to `video.seekable` when that range is available
   * (important for live windows).
   */
  seek(seconds: number): void {
    const seekable = this.video.seekable;
    if (seekable.length > 0) {
      const start = seekable.start(0);
      const end = seekable.end(seekable.length - 1);
      this.video.currentTime = Math.min(Math.max(seconds, start), end);
      return;
    }
    this.video.currentTime = seconds;
  }

  /**
   * Request an HLS variant by index.
   * Emits `levelchange`; full mid-stream reload is deferred to a later milestone.
   */
  setLevel(index: number): void {
    this.loader?.setLevel?.(index);
  }

  /** Current {@link PlaybackMode} (`progressive`, `mse-hls`, or `native-hls-fallback`). */
  getPlaybackMode(): PlaybackMode {
    return this.playbackMode;
  }

  /** Tear down loaders, cues, listeners, and clear the media element. Idempotent. */
  destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.destroyed = true;
    this.abortLoad?.abort();
    this.loader?.destroy();
    this.loader = null;
    this.adScheduler.destroy();
    this.unbindVideoEvents();
    this.events.clear();
    clearTextTracks(this.video);
    this.video.removeAttribute('src');
    this.video.load();
  }

  /** Internal load path shared by {@link load} and {@link loadPlaylist}. */
  private async loadAsset(asset: MediaAsset, index: number): Promise<void> {
    if (this.destroyed) {
      return;
    }
    this.abortLoad?.abort();
    this.abortLoad = new AbortController();
    this.loader?.destroy();
    this.loader = null;
    clearTextTracks(this.video);
    attachTextTracks(this.video, asset.textTracks);

    this.events.emit('assetchange', { asset, index });
    this.events.emit('load', { asset });

    const ctx = {
      video: this.video,
      signal: this.abortLoad.signal,
      onPlaybackMode: (mode: PlaybackMode) => this.setPlaybackMode(mode),
    };

    try {
      if (asset.kind === 'progressive') {
        this.loader = new ProgressiveLoader(ctx);
      } else if (asset.kind === 'hls-vod') {
        this.loader = this.createHlsLoader(ctx);
      } else {
        this.loader = new HlsLiveLoader(ctx);
      }
      this.adScheduler.setCues(asset.adCues);
      this.adScheduler.firePreroll(asset.adCues);
      this.adScheduler.attach();
      await this.loader.load(asset);
      if (this.options.autoplay) {
        await this.play();
      }
    } catch (error) {
      // Prefer native HLS when MSE path fails for manifest URLs (Safari).
      if (asset.kind !== 'progressive' && asset.url.includes('.m3u8')) {
        const opened = await this.tryNativeHlsFallback(asset);
        if (opened) {
          return;
        }
      }
      const err = error instanceof Error ? error : new Error(String(error));
      this.events.emit('error', { error: err });
      throw err;
    }
  }

  private createHlsLoader(ctx: LoaderContext): PlaybackLoader {
    if (!isMseSupported()) {
      throw new MediaPlayerError(ErrorCodes.MSE_UNSUPPORTED, 'MSE not supported');
    }
    return new HlsVodLoader(ctx, (level) => this.events.emit('levelchange', { level }));
  }

  /**
   * Last-resort Safari path: assign the m3u8 to `video.src` and emit
   * `playbackmodechange: native-hls-fallback`.
   */
  private async tryNativeHlsFallback(asset: MediaAsset): Promise<boolean> {
    this.setPlaybackMode('native-hls-fallback');
    this.video.src = asset.url;
    this.video.load();
    return new Promise((resolve) => {
      const onCanPlay = () => {
        cleanup();
        resolve(true);
      };
      const onError = () => {
        cleanup();
        resolve(false);
      };
      const cleanup = () => {
        this.video.removeEventListener('canplay', onCanPlay);
        this.video.removeEventListener('error', onError);
      };
      this.video.addEventListener('canplay', onCanPlay);
      this.video.addEventListener('error', onError);
    });
  }

  private setPlaybackMode(mode: PlaybackMode): void {
    this.playbackMode = mode;
    this.events.emit('playbackmodechange', { mode });
  }

  private onEnded = (): void => {
    this.events.emit('ended', undefined);
    if (this.playlist?.continuousPlay && this.playlist.hasNext()) {
      const next = this.playlist.next();
      if (next) {
        void this.loadAsset(next, this.playlist.currentIndex());
        void this.play();
      }
    }
  };

  private onTimeUpdate = (): void => {
    this.events.emit('timeupdate', { currentTime: this.video.currentTime });
    this.events.emit('buffered', { ranges: this.video.buffered });
  };

  private bindVideoEvents(): void {
    this.video.addEventListener('ended', this.onEnded);
    this.video.addEventListener('timeupdate', this.onTimeUpdate);
  }

  private unbindVideoEvents(): void {
    this.video.removeEventListener('ended', this.onEnded);
    this.video.removeEventListener('timeupdate', this.onTimeUpdate);
  }
}
