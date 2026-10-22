/**
 * `@tgmc/image` — Node / Nitro / Lambda image ingest and transforms.
 *
 * Pixel pipelines use `sharp`. CSS color math / dominant polish use `@tgmc/theme` `Color`.
 * Cache keys use `@tgmc/utilities` `sha256Hex`; aspect meta uses `/universal` `aspectRatio`.
 *
 * @packageDocumentation
 */

export { ImageAsset } from './image-asset.js';
export type { ImageAssetInput } from './image-asset.js';

export { enhancePixels, polishDominantColor, toMonotone } from './color.js';
export { cropImage, resizeImage } from './geometry.js';
export { ingestImage, ingestThumbBuffer } from './ingest.js';
export { transformImage } from './transform.js';
export type { TransformOptions } from './transform.js';
export { applyTransparency } from './transparency.js';

export { parseDataUrl, toLqipDataUrl } from './data-url.js';
export {
  ALLOWED_FORMATS,
  DEFAULT_LQIP_LONG_EDGE,
  DEFAULT_QUALITY,
  DEFAULT_THUMB_LONG_EDGE,
  MAX_BYTES,
  MAX_EDGE_PX,
  MAX_INPUT_PIXELS,
  MAX_TRANSFORM_OPS,
  assertAllowedFormat,
  assertOpCount,
  assertWithinByteLimit,
  clampEdge,
  clampQuality,
  contentTypeFor,
  sharpDecodeOptions,
} from './limits.js';

export { assertSafeImageInput } from './preflight.js';

export { cacheFilePath, hashBuffer, hashFile, imageCacheKey, readImageCache, writeImageCache } from './cache.js';
export type { CacheLookup, CacheMeta } from './cache.js';

export type {
  ColorEnhanceOps,
  CropOps,
  ImageArtifactRef,
  ImageFormat,
  ImageInput,
  IngestOptions,
  MonoOps,
  ResizeOps,
  TransformOp,
  TransformResult,
  TransparencyOps,
  VariantMeta,
} from './types.js';
