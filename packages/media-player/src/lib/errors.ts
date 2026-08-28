/**
 * Typed error thrown by the media player when a recoverable or fatal failure
 * can be classified with a stable {@link ErrorCodes} value.
 */
export class MediaPlayerError extends Error {
  /** Machine-readable code from {@link ErrorCodes}. */
  readonly code: string;

  constructor(code: string, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'MediaPlayerError';
    this.code = code;
  }
}

/** Stable string codes for {@link MediaPlayerError.code}. */
export const ErrorCodes = {
  /** Browser lacks usable MediaSource / ManagedMediaSource for the MIME type. */
  MSE_UNSUPPORTED: 'mse_unsupported',
  /** MediaSource opened but failed during buffer setup. */
  MSE_OPEN_FAILED: 'mse_open_failed',
  /** Generic asset / network load failure. */
  LOAD_FAILED: 'load_failed',
  /** Operation attempted after {@link TgmcPlayer.destroy} / engine destroy. */
  DESTROYED: 'destroyed',
  /** Empty playlist or otherwise invalid asset input. */
  INVALID_ASSET: 'invalid_asset',
} as const;
