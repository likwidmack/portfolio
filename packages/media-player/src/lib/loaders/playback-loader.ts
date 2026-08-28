import type { MediaAssetInput, PlaybackMode } from '../types.js';

/** Shared context passed from {@link TgmcPlayer} into format loaders. */
export interface LoaderContext {
  video: HTMLVideoElement;
  /** Abort in-flight fetches when the host loads a new asset or destroys. */
  signal: AbortSignal;
  /** Report the active {@link PlaybackMode} (emits `playbackmodechange`). */
  onPlaybackMode: (mode: PlaybackMode) => void;
}

/**
 * Strategy interface for progressive and HLS loaders.
 * Implementations must not own MediaSource attach outside {@link MediaSourceEngine}.
 */
export interface PlaybackLoader {
  readonly mode: PlaybackMode;
  load(asset: MediaAssetInput): Promise<void>;
  destroy(): void;
  /** Optional ABR / variant selection (HLS). */
  setLevel?(index: number): void;
}
