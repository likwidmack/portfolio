import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const engineMock = vi.hoisted(() => {
  const api = {
    open: vi.fn().mockResolvedValue(undefined),
    appendVideo: vi.fn(),
    endOfStream: vi.fn().mockResolvedValue(undefined),
    destroy: vi.fn(),
  };
  return {
    api,
    MediaSourceEngine: vi.fn(function MediaSourceEngine() {
      return api;
    }),
  };
});

vi.mock('../../src/lib/engine/media-source-engine.js', () => ({
  MediaSourceEngine: engineMock.MediaSourceEngine,
}));

import { HlsVodLoader } from '../../src/lib/hls/hls-vod-loader.js';
import type { LoaderContext } from '../../src/lib/loaders/playback-loader.js';
import type { LevelInfo } from '../../src/lib/types.js';

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

function createContext() {
  const modes: string[] = [];
  const ctx: LoaderContext = {
    video: { src: '' } as HTMLVideoElement,
    signal: new AbortController().signal,
    onPlaybackMode: (mode) => {
      modes.push(mode);
    },
  };
  return { ctx, modes };
}

describe('HlsVodLoader', () => {
  beforeEach(() => {
    engineMock.api.open.mockClear();
    engineMock.api.appendVideo.mockClear();
    engineMock.api.endOfStream.mockClear();
    engineMock.api.destroy.mockClear();
    engineMock.MediaSourceEngine.mockClear();

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const href = String(input);
        if (href.includes('master.m3u8')) {
          return new Response(master, { status: 200 });
        }
        if (href.includes('index.m3u8')) {
          return new Response(media, { status: 200 });
        }
        return new Response(new Uint8Array([1, 2, 3]), { status: 200 });
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('opens MSE, appends fMP4 segments, and ends the stream', async () => {
    const { ctx, modes } = createContext();
    const levels: LevelInfo[] = [];
    const loader = new HlsVodLoader(ctx, (level) => levels.push(level));

    await loader.load({
      url: 'https://cdn.example.com/master.m3u8',
      kind: 'hls-vod',
    });

    expect(modes).toEqual(['mse-hls']);
    expect(engineMock.api.open).toHaveBeenCalledOnce();
    expect(engineMock.api.appendVideo).toHaveBeenCalledTimes(2);
    expect(engineMock.api.endOfStream).toHaveBeenCalledOnce();
    expect(levels[0]?.index).toBe(0);
    expect(levels[0]?.bandwidth).toBe(1280000);

    loader.setLevel(1);
    expect(levels.at(-1)?.index).toBe(1);
    expect(levels.at(-1)?.height).toBe(720);

    loader.destroy();
    expect(engineMock.api.destroy).toHaveBeenCalledOnce();
  });

  it('ignores out-of-range setLevel calls', async () => {
    const { ctx } = createContext();
    const levels: LevelInfo[] = [];
    const loader = new HlsVodLoader(ctx, (level) => levels.push(level));

    await loader.load({
      url: 'https://cdn.example.com/master.m3u8',
      kind: 'hls-vod',
    });
    const before = levels.length;
    loader.setLevel(99);
    expect(levels).toHaveLength(before);
    loader.destroy();
  });
});
