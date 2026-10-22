import { MAX_TRANSFORM_OPS, type TransformOp } from '@tgmc/image';

import { RecipeValidationError } from './errors.js';
import type { MediaKind, TransformRecipe } from './types.js';

const IMAGE_OP_TYPES = new Set(['color', 'mono', 'transparency', 'resize', 'crop', 'format']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertFiniteNumber(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new RecipeValidationError(`${label} must be a finite number`);
  }
  return value;
}

function validateImageOp(op: Record<string, unknown>): TransformOp {
  const type = op.type;
  if (typeof type !== 'string' || !IMAGE_OP_TYPES.has(type)) {
    throw new RecipeValidationError(`Invalid image transform op: ${JSON.stringify(op)}`);
  }

  switch (type) {
    case 'resize': {
      if (!isRecord(op.ops)) {
        throw new RecipeValidationError('resize op requires an ops object');
      }
      const width = op.ops.width;
      const height = op.ops.height;
      if (width == null && height == null) {
        throw new RecipeValidationError('resize requires width and/or height');
      }
      if (width != null) assertFiniteNumber(width, 'resize.width');
      if (height != null) assertFiniteNumber(height, 'resize.height');
      return op as TransformOp;
    }
    case 'crop': {
      if (!isRecord(op.ops)) {
        throw new RecipeValidationError('crop op requires an ops object');
      }
      for (const key of ['left', 'top', 'width', 'height'] as const) {
        assertFiniteNumber(op.ops[key], `crop.${key}`);
      }
      return op as TransformOp;
    }
    case 'color': {
      if (!isRecord(op.ops)) {
        throw new RecipeValidationError('color op requires an ops object');
      }
      return op as TransformOp;
    }
    case 'mono': {
      if (op.ops != null && !isRecord(op.ops)) {
        throw new RecipeValidationError('mono op ops must be an object when present');
      }
      return op as TransformOp;
    }
    case 'transparency': {
      if (!isRecord(op.ops) || (op.ops.mode !== 'hue' && op.ops.mode !== 'grayscale')) {
        throw new RecipeValidationError('transparency op requires ops.mode of hue|grayscale');
      }
      if (op.ops.mode === 'hue') {
        assertFiniteNumber(op.ops.hue, 'transparency.hue');
        if (op.ops.tolerance != null) {
          assertFiniteNumber(op.ops.tolerance, 'transparency.tolerance');
        }
      } else if (op.ops.threshold != null) {
        assertFiniteNumber(op.ops.threshold, 'transparency.threshold');
      }
      return op as TransformOp;
    }
    case 'format': {
      const format = op.format;
      if (format !== 'webp' && format !== 'jpeg' && format !== 'png' && format !== 'avif') {
        throw new RecipeValidationError(`Invalid format op format: ${String(format)}`);
      }
      return op as TransformOp;
    }
    default: {
      const _exhaustive: never = type as never;
      throw new RecipeValidationError(`Unhandled image op type: ${_exhaustive}`);
    }
  }
}

/**
 * Validate and normalize a transform recipe for a parent asset kind.
 */
export function parseRecipe(kind: MediaKind, raw: unknown): TransformRecipe {
  if (!isRecord(raw)) {
    throw new RecipeValidationError('Recipe must be an object');
  }

  const recipeKind = raw.kind;
  if (recipeKind !== kind) {
    throw new RecipeValidationError(`Recipe kind "${String(recipeKind)}" does not match asset kind "${kind}"`);
  }

  switch (kind) {
    case 'image': {
      const ops = raw.ops;
      if (!Array.isArray(ops) || ops.length === 0) {
        throw new RecipeValidationError('Image recipe requires a non-empty ops array');
      }
      if (ops.length > MAX_TRANSFORM_OPS) {
        throw new RecipeValidationError(`Image recipe exceeds max ops (${MAX_TRANSFORM_OPS})`);
      }
      const normalized: TransformOp[] = [];
      for (const op of ops) {
        if (!isRecord(op)) {
          throw new RecipeValidationError(`Invalid image transform op: ${JSON.stringify(op)}`);
        }
        normalized.push(validateImageOp(op));
      }
      const format = raw.format;
      if (format != null && format !== 'webp' && format !== 'jpeg' && format !== 'png' && format !== 'avif') {
        throw new RecipeValidationError(`Invalid image format: ${String(format)}`);
      }
      const quality = raw.quality;
      if (quality != null && (typeof quality !== 'number' || !Number.isFinite(quality))) {
        throw new RecipeValidationError('Image quality must be a finite number');
      }
      return {
        kind: 'image',
        ops: normalized,
        ...(typeof format === 'string' ? { format: format as 'webp' | 'jpeg' | 'png' | 'avif' } : {}),
        ...(typeof quality === 'number' ? { quality } : {}),
      };
    }
    case 'audio':
      return {
        kind: 'audio',
        ...(isRecord(raw.ops) ? { ops: raw.ops } : {}),
      };
    case 'video':
      return {
        kind: 'video',
        ...(isRecord(raw.ops) ? { ops: raw.ops } : {}),
      };
    case 'svg':
      return {
        kind: 'svg',
        ...(isRecord(raw.ops) ? { ops: raw.ops } : {}),
      };
    case 'model':
      return {
        kind: 'model',
        ...(isRecord(raw.ops) ? { ops: raw.ops } : {}),
      };
    case 'document':
      return {
        kind: 'document',
        ...(isRecord(raw.ops) ? { ops: raw.ops } : {}),
      };
    default: {
      const _exhaustive: never = kind;
      throw new RecipeValidationError(`Unhandled media kind: ${_exhaustive}`);
    }
  }
}
