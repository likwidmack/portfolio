/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from 'vitest';

import type { LoaderContext } from '../../src/lib/loaders/playback-loader.js';
import { ProgressiveLoader } from '../../src/lib/loaders/progressive-loader.js';

function createContext() {
  const video = document.createElement('video');
  video.load = vi.fn();
  const modes: string[] = [];
  const ctx: LoaderContext = {
    video,
    signal: new AbortController().signal,
    onPlaybackMode: (mode) => {
      modes.push(mode);
    },
  };
  return { ctx, video, modes };
}

describe('ProgressiveLoader', () => {
  it('sets progressive mode and resolves on canplay', async () => {
    const { ctx, video, modes } = createContext();
    const onLoaded = vi.fn();
    const loader = new ProgressiveLoader(ctx, onLoaded);

    const pending = loader.load({
      url: 'https://example.com/clip.mp4',
      kind: 'progressive',
    });
    queueMicrotask(() => video.dispatchEvent(new Event('canplay')));
    await pending;

    expect(modes).toEqual(['progressive']);
    expect(video.src).toContain('clip.mp4');
    expect(onLoaded).toHaveBeenCalledOnce();
    loader.destroy();
  });

  it('rejects when the media element errors', async () => {
    const { ctx, video } = createContext();
    const loader = new ProgressiveLoader(ctx);

    const pending = loader.load({
      url: 'https://example.com/bad.mp4',
      kind: 'progressive',
    });
    queueMicrotask(() => video.dispatchEvent(new Event('error')));

    await expect(pending).rejects.toThrow(/progressive load failed/i);
    loader.destroy();
  });

  it('aborts an in-flight load on destroy', async () => {
    const { ctx, video } = createContext();
    const loader = new ProgressiveLoader(ctx);

    const pending = loader.load({
      url: 'https://example.com/clip.mp4',
      kind: 'progressive',
    });
    loader.destroy();

    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    expect(video.src).toContain('clip.mp4');
  });
});
