/**
 * Shared types for `@tgmc/image` (Node / Nitro / Lambda).
 */

export type ImageInput = string | Buffer | Uint8Array;

export type ImageFormat = 'webp' | 'jpeg' | 'png' | 'avif';

export type ColorEnhanceOps = {
  brightness?: number;
  contrast?: number;
  saturation?: number;
};

export type MonoOps = {
  /** When true, convert to grayscale. */
  grayscale?: boolean;
};

export type TransparencyOps =
  | {
      mode: 'hue';
      /** Target hue in degrees [0, 360). */
      hue: number;
      /** Acceptable hue distance in degrees (default 25). */
      tolerance?: number;
    }
  | {
      mode: 'grayscale';
      /** Max channel delta from gray for a pixel to become transparent (0–255, default 12). */
      threshold?: number;
    };

export type ResizeOps = {
  width?: number;
  height?: number;
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  withoutEnlargement?: boolean;
};

export type CropOps = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type TransformOp =
  | { type: 'color'; ops: ColorEnhanceOps }
  | { type: 'mono'; ops?: MonoOps }
  | { type: 'transparency'; ops: TransparencyOps }
  | { type: 'resize'; ops: ResizeOps }
  | { type: 'crop'; ops: CropOps }
  | { type: 'format'; format: ImageFormat; quality?: number };

export type VariantMeta = {
  width: number;
  height: number;
  format: ImageFormat;
  aspectCss: string;
  ratio: number;
};

export type ImageArtifactRef = {
  /** Repo- or public-relative path when written to disk. */
  path?: string;
  /** Optional CDN-facing relative key. */
  key?: string;
};

export type IngestOptions = {
  thumbLongEdge?: number;
  lqipLongEdge?: number;
  quality?: number;
  /** When set, write thumb buffer to this absolute path (atomic temp + rename). */
  thumbOutPath?: string;
  enhanceDominant?: boolean;
};

export type TransformResult = {
  buffer: Buffer;
  contentType: string;
  meta: VariantMeta;
};
