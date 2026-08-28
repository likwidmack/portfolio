/**
 * Public entry for `@tgmc/media-player`.
 *
 * Prefer {@link TgmcPlayer} for integration. Lower-level exports
 * (`MediaSourceEngine`, domain models, events) are available for advanced use.
 */
export { MediaAsset } from './lib/domain/media-asset.js';
export { Playlist, createPlaylist } from './lib/domain/playlist.js';
export { MediaSourceEngine } from './lib/engine/media-source-engine.js';
export { ErrorCodes, MediaPlayerError } from './lib/errors.js';
export { PlayerEventBus } from './lib/events/player-event-bus.js';
export { TgmcPlayer } from './lib/player/tgmc-player.js';
export type {
  AdCuePoint,
  LevelInfo,
  MediaAssetInput,
  MediaAssetKind,
  PlaybackMode,
  PlayerEventHandler,
  PlayerEventMap,
  PlayerEventName,
  PlaylistInput,
  TextTrackRef,
  TgmcPlayerOptions,
} from './lib/types.js';
