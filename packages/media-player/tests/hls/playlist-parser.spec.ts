import { describe, expect, it } from 'vitest';

import { parseMasterPlaylist, parseMediaPlaylist } from '../../src/lib/hls/playlist-parser.js';

const master = `#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=1280000,RESOLUTION=640x360
low/index.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2560000,RESOLUTION=1280x720
high/index.m3u8
`;

const media = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:10
#EXTINF:9.0,
seg0.m4s
#EXTINF:9.0,
seg1.m4s
#EXT-X-ENDLIST
`;

describe('playlist-parser', () => {
  it('parses master variants', () => {
    const variants = parseMasterPlaylist(master, 'https://cdn.example.com/master.m3u8');
    expect(variants).toHaveLength(2);
    expect(variants[0].url).toContain('low/index.m3u8');
    expect(variants[0].bandwidth).toBe(1280000);
    expect(variants[0].resolution).toEqual({ width: 640, height: 360 });
    expect(variants[1].resolution).toEqual({ width: 1280, height: 720 });
  });

  it('parses media segments', () => {
    const parsed = parseMediaPlaylist(media, 'https://cdn.example.com/vod/index.m3u8');
    expect(parsed.segments).toHaveLength(2);
    expect(parsed.endList).toBe(true);
  });
});
