/**
 * Ambient types for browser MSE APIs not yet in the default TypeScript DOM lib
 * (notably Safari `ManagedMediaSource`).
 */
interface ManagedMediaSource extends MediaSource {
  startStreaming(): void;
  streamingAllowed: boolean;
}
