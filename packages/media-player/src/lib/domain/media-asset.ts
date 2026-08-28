import type { AdCuePoint, MediaAssetInput, TextTrackRef } from '../types.js';

/**
 * Normalized media asset with defaults applied (`id`, empty track/cue arrays).
 */
export class MediaAsset implements MediaAssetInput {
  readonly id: string;
  readonly url: string;
  readonly kind: MediaAssetInput['kind'];
  readonly title?: string;
  readonly textTracks: TextTrackRef[];
  readonly adCues: AdCuePoint[];

  constructor(input: MediaAssetInput) {
    if (!input.url) {
      throw new Error('MediaAsset requires url');
    }
    this.id = input.id ?? input.url;
    this.url = input.url;
    this.kind = input.kind;
    this.title = input.title;
    this.textTracks = input.textTracks ?? [];
    this.adCues = input.adCues ?? [];
  }
}
