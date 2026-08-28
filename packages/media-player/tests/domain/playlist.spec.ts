import { describe, expect, it } from 'vitest';

import { createPlaylist } from '../../src/lib/domain/playlist.js';
import type { MediaAssetInput } from '../../src/lib/types.js';

describe('Playlist', () => {
  const items: MediaAssetInput[] = [
    { url: 'https://example.com/a.mp4', kind: 'progressive' },
    { url: 'https://example.com/b.m3u8', kind: 'hls-vod' },
  ];

  it('advances with continuous play semantics', () => {
    const playlist = createPlaylist({ items, continuousPlay: true });
    expect(playlist.current()?.url).toBe(items[0].url);
    const next = playlist.next();
    expect(next?.url).toBe(items[1].url);
    expect(playlist.hasNext()).toBe(false);
  });
});

describe('public exports', () => {
  it('resolves package entry without side effects', async () => {
    const mod = await import('../../src/index.js');
    expect(mod.TgmcPlayer).toBeTypeOf('function');
    expect(mod.createPlaylist).toBeTypeOf('function');
  });
});
