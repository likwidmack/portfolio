/**
 * Injectable globals used by capability probes (tests pass mocks here).
 */
export interface MseGlobals {
  MediaSource?: typeof MediaSource;
  /** Safari / iOS Managed Media Source when available. */
  ManagedMediaSource?: typeof MediaSource;
  SourceBuffer?: typeof SourceBuffer;
}

/**
 * Prefer `ManagedMediaSource` (Safari) when defined, else standard `MediaSource`.
 */
export function getMseConstructor(globals: MseGlobals = globalThis as MseGlobals): typeof MediaSource | undefined {
  return globals.ManagedMediaSource ?? globals.MediaSource;
}

/**
 * Whether the selected MSE constructor reports support for `mimeType`.
 *
 * @param mimeType - Defaults to a common AVC + AAC fMP4 codec string
 */
export function isMseSupported(
  mimeType = 'video/mp4; codecs="avc1.42E01E,mp4a.40.2"',
  globals: MseGlobals = globalThis as MseGlobals
): boolean {
  const MSE = getMseConstructor(globals);
  if (!MSE || typeof MSE.isTypeSupported !== 'function') {
    return false;
  }
  return MSE.isTypeSupported(mimeType);
}
