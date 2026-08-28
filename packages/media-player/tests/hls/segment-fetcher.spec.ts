import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchBuffer, resolveUrl } from '../../src/lib/hls/segment-fetcher.js';

describe('segment-fetcher', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('resolves relative segment URIs against the playlist base', () => {
    expect(resolveUrl('https://cdn.example.com/vod/index.m3u8', 'seg0.m4s')).toBe(
      'https://cdn.example.com/vod/seg0.m4s'
    );
  });

  it('returns the relative string when URL construction fails', () => {
    expect(resolveUrl('not-a-url', 'seg0.m4s')).toBe('seg0.m4s');
  });

  it('fetches segment bytes', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(new Uint8Array([4, 5, 6]), { status: 200 }))
    );
    const bytes = await fetchBuffer('https://cdn.example.com/seg0.m4s');
    expect(Array.from(bytes)).toEqual([4, 5, 6]);
  });

  it('throws on non-OK segment responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 404 }))
    );
    await expect(fetchBuffer('https://cdn.example.com/missing.m4s')).rejects.toThrow(/404/);
  });
});
