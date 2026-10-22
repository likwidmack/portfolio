/**
 * Catalog variants: a fixed set of named derivatives with canonical recipes.
 *
 * `t` = 320 px wide thumbnail, `640` / `1280` / `1920` = that many px wide. Output is webp by
 * default; any image format can be selected, and each (variant, format) is its own child/key.
 * `p` (poster) is reserved and not materializable yet. Any other valid recipe is a `custom` child.
 */

import type { ImageFormat } from '@tgmc/image';

import { RecipeValidationError } from './errors.js';
import type { MediaChildVariant, MediaVariantCode } from './paths.js';
import { VARIANT_CODES } from './paths.js';
import type { ImageTransformRecipe, TransformRecipe } from './types.js';

export const CATALOG_VARIANTS = ['t', '640', '1280', '1920'] as const;
export type CatalogVariantCode = (typeof CATALOG_VARIANTS)[number];

export const CATALOG_VARIANT_WIDTHS: Record<CatalogVariantCode, number> = {
  t: 320,
  '640': 640,
  '1280': 1280,
  '1920': 1920,
};

export const DEFAULT_VARIANT_FORMAT: ImageFormat = 'webp';

const FORMATS: readonly ImageFormat[] = ['webp', 'avif', 'jpeg', 'png'];

export function isCatalogVariant(value: unknown): value is CatalogVariantCode {
  return typeof value === 'string' && (CATALOG_VARIANTS as readonly string[]).includes(value);
}

export function isImageFormat(value: unknown): value is ImageFormat {
  return typeof value === 'string' && (FORMATS as readonly string[]).includes(value);
}

/** Object key extension for an image format (`jpeg` -> `jpg`). */
export function extensionForFormat(format: ImageFormat): string {
  return format === 'jpeg' ? 'jpg' : format;
}

/** Canonical recipe for a catalog variant. */
export function catalogRecipe(
  variant: CatalogVariantCode,
  format: ImageFormat = DEFAULT_VARIANT_FORMAT
): ImageTransformRecipe {
  return {
    kind: 'image',
    ops: [{ type: 'resize', ops: { width: CATALOG_VARIANT_WIDTHS[variant] } }],
    format,
  };
}

/**
 * Validate a requested catalog variant code. `p` is reserved and rejected with a clear error;
 * anything else outside the catalog is invalid.
 */
export function assertMaterializableVariant(variant: unknown): CatalogVariantCode {
  if (variant === 'p') {
    throw new RecipeValidationError(
      'Variant "p" (poster) is reserved and cannot be materialized yet; posters will be separate image assets linked via meta.posterId'
    );
  }
  if (!isCatalogVariant(variant)) {
    throw new RecipeValidationError(
      `Unknown variant "${String(variant)}"; expected one of ${CATALOG_VARIANTS.join(', ')} or a custom recipe`
    );
  }
  return variant;
}

/**
 * Catalog variant (and format) a parsed recipe corresponds to, or `null` when it is custom.
 * A catalog recipe is a single width-only resize to a catalog width with no quality override.
 */
export function detectCatalogVariant(
  recipe: TransformRecipe
): { variant: CatalogVariantCode; format: ImageFormat } | null {
  if (recipe.kind !== 'image' || recipe.quality != null || recipe.ops.length !== 1) {
    return null;
  }
  const op = recipe.ops[0];
  if (!op || op.type !== 'resize') {
    return null;
  }
  const keys = Object.keys(op.ops);
  const width = (op.ops as { width?: unknown }).width;
  if (keys.length !== 1 || keys[0] !== 'width' || typeof width !== 'number') {
    return null;
  }
  const variant = CATALOG_VARIANTS.find((code) => CATALOG_VARIANT_WIDTHS[code] === width);
  if (!variant) {
    return null;
  }
  return { variant, format: recipe.format ?? DEFAULT_VARIANT_FORMAT };
}

/** All codes that may appear in a key (`p` included), for validation messages. */
export const KNOWN_VARIANT_CODES: readonly MediaVariantCode[] = VARIANT_CODES;

export type { MediaChildVariant };
