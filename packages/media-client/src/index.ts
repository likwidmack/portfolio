/**
 * `@tgmc/media-client` — portable media HTTP client (browser + Node).
 *
 * @packageDocumentation
 */

export {
  MEDIA_KINDS,
  MEDIA_TENANTS,
  MEDIA_VARIANTS,
  MediaApiError,
  MediaNameConflictError,
  createMediaApiClient,
  isMediaKind,
  parseNameConflictData,
  type JobRecord,
  type MediaApiClient,
  type MediaApiClientOptions,
  type MediaAsset,
  type MediaChild,
  type MediaImageFormat,
  type MediaKind,
  type MediaTenant,
  type MediaVariant,
  type NameConflictData,
} from './create-media-api-client.js';
