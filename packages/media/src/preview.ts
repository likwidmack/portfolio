/**
 * Which stored object previews an asset (admin tiles, drawer): a key, never a URL. Hosts prefix it
 * with their public media base (`mediaPublicBaseUrl()` in `@tgmc/media-nuxt`).
 */

import type { MediaAsset, MediaChild } from './types.js';
import { DEFAULT_VARIANT_FORMAT } from './variants.js';

type PreviewChild = Pick<MediaChild, 'variant' | 'status' | 'path'>;

/** Ready `t` thumbnail key, webp first when several formats exist. */
function readyThumbnailKey(children: readonly PreviewChild[]): string | null {
  const ready = children.filter((child) => child.variant === 't' && child.status === 'ready' && child.path);
  const preferred = ready.find((child) => child.path!.endsWith(`.${DEFAULT_VARIANT_FORMAT}`)) ?? ready[0];
  return preferred?.path ?? null;
}

/**
 * Preview key for an asset:
 * - image / svg: the ready `t` thumbnail, else the original (browsers render both);
 * - audio / video: the original (`<audio>` / `<video>`);
 * - model / document: `null` (no transformer yet; show facts instead).
 */
export function mediaPreviewKey(
  asset: Pick<MediaAsset, 'kind' | 'path'>,
  children: readonly PreviewChild[]
): string | null {
  switch (asset.kind) {
    case 'image':
    case 'svg':
      return readyThumbnailKey(children) ?? asset.path;
    case 'audio':
    case 'video':
      return asset.path;
    case 'model':
    case 'document':
      return null;
    default: {
      const unreachable: never = asset.kind;
      throw new Error(`Unsupported media kind: ${String(unreachable)}`);
    }
  }
}

/** Whether {@link mediaPreviewKey} needs the asset's children (only image / svg thumbnails do). */
export function previewNeedsChildren(kind: MediaAsset['kind']): boolean {
  return kind === 'image' || kind === 'svg';
}
