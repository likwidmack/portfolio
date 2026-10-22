import {
  mediaPreviewKey,
  previewNeedsChildren,
  type MediaAsset,
  type MediaChild,
  type MediaLibrary,
} from '@tgmc/media';

import { mediaPublicBaseUrl } from './media-public-url';

/** URLs the admin shows for an asset: the original, and what to preview (`null`: show facts). */
export type MediaAssetUrls = { publicUrl: string; previewUrl: string | null };

export type MediaAssetWithUrls = MediaAsset & MediaAssetUrls;

function assetUrls(base: string, asset: MediaAsset, children: readonly MediaChild[]): MediaAssetUrls {
  const preview = mediaPreviewKey(asset, children);
  return { publicUrl: `${base}/${asset.path}`, previewUrl: preview ? `${base}/${preview}` : null };
}

/** `asset` plus {@link MediaAssetUrls} on {@link mediaPublicBaseUrl} (detail: children already loaded). */
export function withMediaAssetUrls(asset: MediaAsset, children: readonly MediaChild[]): MediaAssetWithUrls {
  return { ...asset, ...assetUrls(mediaPublicBaseUrl(), asset, children) };
}

/**
 * List rows plus {@link MediaAssetUrls}. Only image / svg rows read their children (the `t` thumbnail);
 * a row deleted between the list and that read previews its original.
 */
export async function withMediaAssetUrlsList(
  library: Pick<MediaLibrary, 'listChildren'>,
  assets: readonly MediaAsset[]
): Promise<MediaAssetWithUrls[]> {
  const base = mediaPublicBaseUrl();
  return Promise.all(
    assets.map(async (asset) => {
      const children = previewNeedsChildren(asset.kind) ? await library.listChildren(asset.id).catch(() => []) : [];
      return { ...asset, ...assetUrls(base, asset, children) };
    })
  );
}
