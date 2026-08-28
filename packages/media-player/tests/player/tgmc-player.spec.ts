/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import * as mseCapability from '../../src/lib/engine/mse-capability.js';
import { TgmcPlayer } from '../../src/lib/player/tgmc-player.js';

describe('TgmcPlayer', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects empty playlist', async () => {
    const video = document.createElement('video');
    const player = new TgmcPlayer(video);
    await expect(player.loadPlaylist({ items: [] })).rejects.toThrow(/empty/i);
    player.destroy();
  });

  it('emits playbackmodechange for progressive load', async () => {
    const video = document.createElement('video');
    video.play = vi.fn().mockResolvedValue(undefined);
    const modes: string[] = [];
    const player = new TgmcPlayer(video);
    player.on('playbackmodechange', ({ mode }) => modes.push(mode));

    const loadPromise = player.load({
      url: 'https://example.com/video.mp4',
      kind: 'progressive',
    });
    queueMicrotask(() => video.dispatchEvent(new Event('canplay')));
    await loadPromise;

    expect(modes).toContain('progressive');
    expect(player.getPlaybackMode()).toBe('progressive');
    player.destroy();
  });

  it('emits load, play, pause, timeupdate, and buffered events', async () => {
    const video = document.createElement('video');
    video.play = vi.fn().mockResolvedValue(undefined);
    const player = new TgmcPlayer(video);
    const seen: string[] = [];
    player.on('load', () => seen.push('load'));
    player.on('play', () => seen.push('play'));
    player.on('pause', () => seen.push('pause'));
    player.on('timeupdate', () => seen.push('timeupdate'));
    player.on('buffered', () => seen.push('buffered'));

    const loadPromise = player.load({
      url: 'https://example.com/video.mp4',
      kind: 'progressive',
    });
    queueMicrotask(() => video.dispatchEvent(new Event('canplay')));
    await loadPromise;
    await player.play();
    player.pause();
    Object.defineProperty(video, 'currentTime', { value: 1.5, configurable: true });
    video.dispatchEvent(new Event('timeupdate'));

    expect(seen).toEqual(expect.arrayContaining(['load', 'play', 'pause', 'timeupdate', 'buffered']));
    player.destroy();
  });

  it('clamps seek to the seekable range', () => {
    const video = document.createElement('video');
    Object.defineProperty(video, 'seekable', {
      configurable: true,
      value: {
        length: 1,
        start: () => 10,
        end: () => 100,
      },
    });
    const player = new TgmcPlayer(video);
    player.seek(5);
    expect(video.currentTime).toBe(10);
    player.seek(150);
    expect(video.currentTime).toBe(100);
    player.seek(40);
    expect(video.currentTime).toBe(40);
    player.destroy();
  });

  it('advances continuous playlists on ended', async () => {
    const video = document.createElement('video');
    video.play = vi.fn().mockResolvedValue(undefined);
    const player = new TgmcPlayer(video);
    const urls: string[] = [];
    player.on('assetchange', ({ asset }) => urls.push(asset.url));

    const firstLoad = player.loadPlaylist({
      items: [
        { url: 'https://example.com/a.mp4', kind: 'progressive' },
        { url: 'https://example.com/b.mp4', kind: 'progressive' },
      ],
      continuousPlay: true,
    });
    queueMicrotask(() => video.dispatchEvent(new Event('canplay')));
    await firstLoad;
    expect(urls[0]).toContain('a.mp4');

    const advanced = new Promise<void>((resolve) => {
      const off = player.on('assetchange', ({ asset }) => {
        if (asset.url.includes('b.mp4')) {
          off();
          resolve();
        }
      });
    });
    video.dispatchEvent(new Event('ended'));
    queueMicrotask(() => video.dispatchEvent(new Event('canplay')));
    await advanced;

    expect(urls.some((url) => url.includes('b.mp4'))).toBe(true);
    player.destroy();
  });

  it('falls back to native HLS when MSE is unsupported', async () => {
    vi.spyOn(mseCapability, 'isMseSupported').mockReturnValue(false);
    const video = document.createElement('video');
    video.load = vi.fn();
    const modes: string[] = [];
    const player = new TgmcPlayer(video);
    player.on('playbackmodechange', ({ mode }) => modes.push(mode));

    const pending = player.load({
      url: 'https://example.com/master.m3u8',
      kind: 'hls-vod',
    });
    queueMicrotask(() => video.dispatchEvent(new Event('canplay')));
    await pending;

    expect(modes).toContain('native-hls-fallback');
    expect(player.getPlaybackMode()).toBe('native-hls-fallback');
    expect(video.src).toContain('master.m3u8');
    player.destroy();
  });

  it('fires preroll ad cues on load', async () => {
    const video = document.createElement('video');
    const entered: string[] = [];
    const player = new TgmcPlayer(video);
    player.on('adcueenter', ({ cue }) => entered.push(cue.id));

    const pending = player.load({
      url: 'https://example.com/video.mp4',
      kind: 'progressive',
      adCues: [{ id: 'pre-1', timeSeconds: 0, kind: 'preroll' }],
    });
    queueMicrotask(() => video.dispatchEvent(new Event('canplay')));
    await pending;

    expect(entered).toEqual(['pre-1']);
    player.destroy();
  });

  it('destroy clears without throwing when called twice', () => {
    const video = document.createElement('video');
    const player = new TgmcPlayer(video);
    player.destroy();
    expect(() => player.destroy()).not.toThrow();
  });
});
