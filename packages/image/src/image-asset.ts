/**
 * Normalized image asset (MediaAsset-shaped domain class).
 */

import { resolveCdnPath } from '@tgmc/utilities';
import type { AspectRatio } from '@tgmc/utilities/universal';
import { aspectRatio } from '@tgmc/utilities/universal';

import type { ImageArtifactRef, ImageFormat, VariantMeta } from './types.js';

export type ImageAssetInput = {
  id?: string;
  /** Primary display / source URL or relative path. */
  src: string;
  thumbSrc?: string;
  lqip?: string;
  dominantColor?: string;
  width?: number;
  height?: number;
  format?: ImageFormat;
  artifacts?: ImageArtifactRef[];
};

/**
 * Domain object for ingest / delivery metadata.
 */
export class ImageAsset {
  readonly id: string;
  readonly src: string;
  readonly thumbSrc?: string;
  readonly lqip?: string;
  readonly dominantColor?: string;
  readonly width?: number;
  readonly height?: number;
  readonly format?: ImageFormat;
  readonly aspect?: AspectRatio;
  readonly artifacts: ImageArtifactRef[];

  constructor(input: ImageAssetInput) {
    if (!input.src) {
      throw new Error('ImageAsset requires src');
    }
    this.id = input.id ?? input.src;
    this.src = input.src;
    this.thumbSrc = input.thumbSrc;
    this.lqip = input.lqip;
    this.dominantColor = input.dominantColor;
    this.width = input.width;
    this.height = input.height;
    this.format = input.format;
    this.artifacts = input.artifacts ?? [];
    if (typeof input.width === 'number' && typeof input.height === 'number') {
      this.aspect = aspectRatio(input.width, input.height);
    }
  }

  /** Resolve `src` (or override path) against an optional CDN base. */
  toUrl(cdnUrl?: string, path = this.src): string {
    return resolveCdnPath(path, cdnUrl);
  }

  toMeta(): VariantMeta | undefined {
    if (!this.width || !this.height || !this.format || !this.aspect) {
      return undefined;
    }
    return {
      width: this.width,
      height: this.height,
      format: this.format,
      aspectCss: this.aspect.css,
      ratio: this.aspect.ratio,
    };
  }
}
