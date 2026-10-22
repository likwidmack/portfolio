import { transformImage } from '@tgmc/image';

import { RecipeValidationError, TransformerNotImplementedError } from '../errors.js';
import type { MediaTransformer } from '../ports/index.js';
import type { MediaKind, TransformRecipe, TransformerOutput } from '../types.js';

export class ImageTransformer implements MediaTransformer {
  supports(kind: MediaKind): boolean {
    return kind === 'image';
  }

  async materialize(input: { kind: MediaKind; source: Buffer; recipe: TransformRecipe }): Promise<TransformerOutput> {
    if (input.kind !== 'image' || input.recipe.kind !== 'image') {
      throw new RecipeValidationError('ImageTransformer requires kind/recipe image');
    }
    const result = await transformImage(input.source, input.recipe.ops, {
      // Omit unset options so transformImage keeps its defaults (webp, default quality).
      ...(input.recipe.format ? { format: input.recipe.format } : {}),
      ...(input.recipe.quality != null ? { quality: input.recipe.quality } : {}),
    });
    return {
      buffer: result.buffer,
      contentType: result.contentType,
      meta: { ...result.meta },
    };
  }
}

function stubTransformer(kind: Exclude<MediaKind, 'image'>): MediaTransformer {
  return {
    supports: (candidate) => candidate === kind,
    materialize: async () => {
      throw new TransformerNotImplementedError(kind);
    },
  };
}

export const SvgTransformer = stubTransformer('svg');
export const AudioTransformer = stubTransformer('audio');
export const VideoTransformer = stubTransformer('video');
export const ModelTransformer = stubTransformer('model');
export const DocumentTransformer = stubTransformer('document');

export class TransformerRegistry {
  constructor(private readonly transformers: MediaTransformer[]) {}

  resolve(kind: MediaKind): MediaTransformer {
    const found = this.transformers.find((t) => t.supports(kind));
    if (!found) {
      throw new TransformerNotImplementedError(kind);
    }
    return found;
  }
}

export function createDefaultTransformerRegistry(): TransformerRegistry {
  return new TransformerRegistry([
    new ImageTransformer(),
    SvgTransformer,
    AudioTransformer,
    VideoTransformer,
    ModelTransformer,
    DocumentTransformer,
  ]);
}
