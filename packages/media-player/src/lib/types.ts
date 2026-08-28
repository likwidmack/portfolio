/**
 * Shared public types for `@tgmc/media-player`.
 *
 * Integrators typically interact with {@link MediaAssetInput}, {@link PlaylistInput},
 * {@link TgmcPlayerOptions}, and {@link PlayerEventMap} via {@link TgmcPlayer}.
 */

/** How an asset is delivered to the player. */
export type MediaAssetKind = 'progressive' | 'hls-vod' | 'hls-live';

/**
 * Active playback pipeline.
 *
 * - `progressive` — direct `video.src` for MP4 (and similar)
 * - `mse-hls` — owned MediaSource / SourceBuffer path for HLS
 * - `native-hls-fallback` — Safari (and similar) last resort when MSE cannot open
 */
export type PlaybackMode = 'progressive' | 'mse-hls' | 'native-hls-fallback';

/** Typed event names emitted by {@link TgmcPlayer} / {@link PlayerEventBus}. */
export type PlayerEventName =
  | 'load'
  | 'play'
  | 'pause'
  | 'timeupdate'
  | 'ended'
  | 'error'
  | 'buffered'
  | 'levelchange'
  | 'adcueenter'
  | 'adcueexit'
  | 'playbackmodechange'
  | 'assetchange';

/** WebVTT (or compatible) caption track attached via native `<track>`. */
export interface TextTrackRef {
  /** Absolute or relative URL to a WebVTT file. */
  url: string;
  label?: string;
  language?: string;
  /** When true, the track is marked `default` on the element. */
  default?: boolean;
}

/**
 * Ad cue hook (no ad SDK). Hosts listen for `adcueenter` / `adcueexit` and may pause content.
 */
export interface AdCuePoint {
  /** Stable id used to de-dupe enter/exit within a session. */
  id: string;
  /** Timeline position in seconds (ignored for preroll enter, which fires on load). */
  timeSeconds: number;
  kind: 'preroll' | 'midroll';
}

/** Declarative description of a single playable item. */
export interface MediaAssetInput {
  /** Defaults to `url` when omitted. */
  id?: string;
  url: string;
  kind: MediaAssetKind;
  title?: string;
  textTracks?: TextTrackRef[];
  adCues?: AdCuePoint[];
}

/** Ordered list of assets with optional continuous play. */
export interface PlaylistInput {
  items: MediaAssetInput[];
  /** When true, advance to the next item on `ended`. */
  continuousPlay?: boolean;
  /** Initial index (clamped to `0` when out of range). */
  startIndex?: number;
}

/** Options passed to {@link TgmcPlayer}. */
export interface TgmcPlayerOptions {
  /** Call `play()` after a successful load. */
  autoplay?: boolean;
  /** Target live buffer length in seconds (reserved for live loader tuning). */
  maxBufferLengthSeconds?: number;
  /** Reserved for MSE open retry policy. */
  mseOpenRetries?: number;
}

/** ABR / variant metadata for `levelchange` events. */
export interface LevelInfo {
  index: number;
  height?: number;
  bandwidth?: number;
  url: string;
}

/** Payload map keyed by {@link PlayerEventName}. */
export type PlayerEventMap = {
  load: { asset: MediaAssetInput };
  play: undefined;
  pause: undefined;
  timeupdate: { currentTime: number };
  ended: undefined;
  error: { error: Error };
  buffered: { ranges: TimeRanges | null };
  levelchange: { level: LevelInfo };
  adcueenter: { cue: AdCuePoint };
  adcueexit: { cue: AdCuePoint };
  playbackmodechange: { mode: PlaybackMode };
  assetchange: { asset: MediaAssetInput; index: number };
};

/** Strongly typed listener for a single player event. */
export type PlayerEventHandler<K extends PlayerEventName> = (payload: PlayerEventMap[K]) => void;
