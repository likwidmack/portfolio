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

import { HlsLiveLoader } from '../../src/lib/hls/hls-live-loader.js';
import type { LoaderContext } from '../../src/lib/loaders/playback-loader.js';

function mediaPlaylist(uris: string[]): string {
  const lines = ['#EXTM3U', '#EXT-X-VERSION:3', '#EXT-X-TARGETDURATION:4', '#EXT-X-MEDIA-SEQUENCE:0'];
  for (const uri of uris) {
    lines.push('#EXTINF:4.0,', uri);
  }
  return `${lines.join('\n')}\n`;
}

describe('HlsLiveLoader', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    engineMock.api.open.mockClear();
    engineMock.api.appendVideo.mockClear();
    engineMock.api.destroy.mockClear();
    engineMock.MediaSourceEngine.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('joins the live edge and appends only newly seen segments on poll', async () => {
    let playlist = mediaPlaylist(['seg0.m4s', 'seg1.m4s']);
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const href = String(input);
        if (href.includes('live.m3u8')) {
          return new Response(playlist, { status: 200 });
        }
        return new Response(new Uint8Array([9]), { status: 200 });
      })
    );

    const modes: string[] = [];
    const ctx: LoaderContext = {
      video: { src: '' } as HTMLVideoElement,
      signal: new AbortController().signal,
      onPlaybackMode: (mode) => {
        modes.push(mode);
      },
    };
    const loader = new HlsLiveLoader(ctx);

    await loader.load({
      url: 'https://cdn.example.com/live.m3u8',
      kind: 'hls-live',
    });

    expect(modes).toEqual(['mse-hls']);
    expect(engineMock.api.appendVideo).toHaveBeenCalledTimes(2);

    playlist = mediaPlaylist(['seg0.m4s', 'seg1.m4s', 'seg2.m4s']);
    await vi.advanceTimersByTimeAsync(4000);
    expect(engineMock.api.appendVideo).toHaveBeenCalledTimes(3);

    loader.destroy();
    expect(engineMock.api.destroy).toHaveBeenCalledOnce();

    playlist = mediaPlaylist(['seg1.m4s', 'seg2.m4s', 'seg3.m4s']);
    await vi.advanceTimersByTimeAsync(4000);
    expect(engineMock.api.appendVideo).toHaveBeenCalledTimes(3);
  });
});
