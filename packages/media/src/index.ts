/**
 * `@tgmc/media` — Node media catalog, materialize, audit, local SQLite/FS adapters.
 *
 * @packageDocumentation
 */

export { createMediaLibrary, createSqliteMediaStores } from './create-media-library.js';
export type {
  CreateMediaLibraryOptions,
  CreateSqliteMediaStoresOptions,
  MediaLibraryHandle,
  SqliteMediaStores,
} from './create-media-library.js';
export { IMMUTABLE_CACHE_CONTROL, objectHeaders } from './object-headers.js';
export { DEFAULT_TRANSFER_PAGE_SIZE, TRANSFER_AUDIT_ACTION, TRANSFER_NAME_HOLD_MS, transferMedia } from './transfer.js';
export type {
  MediaEndpoint,
  MediaTransferSource,
  TransferFailure,
  TransferMediaOptions,
  TransferOutcomes,
  TransferReport,
} from './transfer.js';

export { SITE_IMPORT_AUDIT_ACTION, importSiteMedia, siteImportSucceeded } from './site-import.js';
export type { ImportSiteMediaOptions, SiteImportItem, SiteImportRefusal, SiteImportReport } from './site-import.js';
export {
  SITE_MANIFEST_VERSION,
  SITE_MEDIA_ENTRY_KEYS,
  SITE_MEDIA_ID_NAMESPACE,
  SITE_MEDIA_TAG,
  isSiteMediaAsset,
  serializeSiteManifest,
  siteEntryFromAsset,
  siteEntryMeta,
  siteEntryToAsset,
  siteMediaId,
  uniqueSiteMediaName,
  uuidV5,
  validateSiteManifest,
} from './site-manifest.js';
export type { SiteManifestValidation, SiteMediaEntry, SiteMediaManifest } from './site-manifest.js';

export { MediaLibrary } from './media-library.js';
export type { MaterializeOptions, MediaLibraryDeps, ReserveNameInput, ReservedName } from './media-library.js';

export {
  MediaBlobExistsError,
  MediaBlobTooLargeError,
  MediaConflictError,
  MediaNameConflictError,
  MediaNotFoundError,
  RecipeValidationError,
  TransformerNotImplementedError,
} from './errors.js';
export { mediaPreviewKey, previewNeedsChildren } from './preview.js';
export { parseRecipe } from './recipe.js';

export { FS_BLOB_META_SUFFIX, FsBlobStore } from './adapters/fs-blob-store.js';
export type { FsBlobMeta, FsBlobPutOptions, FsBlobReader } from './adapters/fs-blob-store.js';
export { migrateMediaDatabase, openMediaDatabase } from './adapters/sqlite/db.js';
export type { MediaDatabaseOptions } from './adapters/sqlite/db.js';
export { SqliteAuditStore, SqliteCatalogStore, SqliteJobStore } from './adapters/sqlite/stores.js';

export {
  AudioTransformer,
  DocumentTransformer,
  ImageTransformer,
  ModelTransformer,
  SvgTransformer,
  TransformerRegistry,
  VideoTransformer,
  createDefaultTransformerRegistry,
} from './transformers/registry.js';

export { runCli } from './cli.js';

export { NAME_CONFLICT_CODE, mediaErrorToHttp, type MediaHttpError, type NameConflictData } from './http-errors.js';
export { extensionForMime, extensionMatchesMime, mimeForExtension } from './kinds.js';
export {
  ASSET_META_KEYS,
  addTags,
  assetHasTag,
  normalizeAssetMeta,
  normalizeTag,
  normalizeTags,
  readTags,
  removeTags,
  withTags,
} from './meta.js';
export type { AssetMetaKey } from './meta.js';
export { MEDIA_KINDS, defaultMimeForKind, guessMediaKind, isMediaKind } from './types.js';

export {
  MAX_MEDIA_FILENAME_LENGTH,
  isNormalizedMediaFilename,
  slugMediaFilename,
  splitMediaFilename,
  suggestMediaName,
} from './filename.js';
export {
  DEFAULT_MEDIA_CREDIT,
  MEDIA_META_LIMITS,
  assertMediaMeta,
  looksLikeIdentifier,
  normalizeMediaFilename,
  validateMediaMeta,
} from './meta-policy.js';
export type {
  MediaMetaField,
  MediaMetaIssue,
  MediaMetaIssueCode,
  MediaMetaValidation,
  ValidateMediaMetaOptions,
} from './meta-policy.js';
export {
  CUSTOM_VARIANT,
  DEFAULT_TENANT,
  KIND_CODES,
  MEDIA_ROOT,
  TENANT_CODES,
  VARIANT_CODES,
  customVariantSuffix,
  isMediaTenant,
  isVariantCode,
  nameKey,
  originalKey,
  parseMediaKey,
  variantKey,
} from './paths.js';
export type {
  MediaChildVariant,
  MediaKindCode,
  MediaNameRef,
  MediaTenant,
  MediaTenantCode,
  MediaVariantCode,
  MediaVariantSuffix,
  OriginalKeyInput,
  ParsedMediaKey,
} from './paths.js';
export type {
  AudioTransformRecipe,
  AuditEvent,
  ChildStatus,
  DocumentTransformRecipe,
  ImageTransformRecipe,
  IngestInput,
  JobRecord,
  JobStatus,
  JobType,
  ListAssetsFilter,
  MaterializeResult,
  MediaAsset,
  MediaChild,
  MediaKind,
  ModelTransformRecipe,
  NameHolder,
  SvgTransformRecipe,
  TransformRecipe,
  TransformerOutput,
  VideoTransformRecipe,
} from './types.js';
export {
  CATALOG_VARIANTS,
  CATALOG_VARIANT_WIDTHS,
  DEFAULT_VARIANT_FORMAT,
  assertMaterializableVariant,
  catalogRecipe,
  detectCatalogVariant,
  extensionForFormat,
  isCatalogVariant,
  isImageFormat,
} from './variants.js';
export type { CatalogVariantCode } from './variants.js';

export type { AuditStore, BlobPutOptions, BlobStore, CatalogStore, JobStore, MediaTransformer } from './ports/index.js';
