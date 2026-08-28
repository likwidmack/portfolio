/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';

import { attachTextTracks, clearTextTracks } from '../../src/lib/domain/text-tracks.js';

describe('text-tracks', () => {
  it('attaches WebVTT caption tracks to the video element', () => {
    const video = document.createElement('video');
    attachTextTracks(video, [
      {
        url: 'https://example.com/en.vtt',
        label: 'English',
        language: 'en',
        default: true,
      },
    ]);

    const track = video.querySelector('track');
    expect(track).not.toBeNull();
    expect(track?.getAttribute('kind')).toBe('captions');
    expect(track?.getAttribute('src')).toContain('en.vtt');
    expect(track?.getAttribute('label')).toBe('English');
    expect(track?.getAttribute('srclang')).toBe('en');
    expect((track as HTMLTrackElement).default).toBe(true);
  });

  it('clears previously attached tracks', () => {
    const video = document.createElement('video');
    attachTextTracks(video, [{ url: '/a.vtt' }, { url: '/b.vtt' }]);
    expect(video.querySelectorAll('track')).toHaveLength(2);
    clearTextTracks(video);
    expect(video.querySelectorAll('track')).toHaveLength(0);
  });
});
