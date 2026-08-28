import { describe, expect, it } from 'vitest';

import { MediaAsset } from '../../src/lib/domain/media-asset.js';

describe('MediaAsset', () => {
  it('applies defaults for id, textTracks, and adCues', () => {
    const asset = new MediaAsset({
      url: 'https://example.com/a.mp4',
      kind: 'progressive',
      title: 'Clip',
    });

    expect(asset.id).toBe('https://example.com/a.mp4');
    expect(asset.title).toBe('Clip');
    expect(asset.textTracks).toEqual([]);
    expect(asset.adCues).toEqual([]);
  });

  it('preserves explicit id and track metadata', () => {
    const asset = new MediaAsset({
      id: 'asset-1',
      url: 'https://example.com/a.m3u8',
      kind: 'hls-vod',
      textTracks: [{ url: '/caps.vtt', language: 'en', default: true }],
      adCues: [{ id: 'pre', timeSeconds: 0, kind: 'preroll' }],
    });

    expect(asset.id).toBe('asset-1');
    expect(asset.textTracks).toHaveLength(1);
    expect(asset.adCues[0]?.id).toBe('pre');
  });

  it('rejects missing url', () => {
    expect(
      () =>
        new MediaAsset({
          url: '',
          kind: 'progressive',
        })
    ).toThrow(/requires url/i);
  });
});
