import type { TextTrackRef } from '../types.js';

/**
 * Append native `<track kind="captions">` children for WebVTT sources.
 * Does not parse SRT — use WebVTT only in v1.
 */
export function attachTextTracks(video: HTMLVideoElement, tracks: TextTrackRef[]): void {
  for (const track of tracks) {
    const element = document.createElement('track');
    element.kind = 'captions';
    element.src = track.url;
    element.label = track.label ?? track.language ?? 'Captions';
    if (track.language) {
      element.srclang = track.language;
    }
    element.default = track.default ?? false;
    video.appendChild(element);
  }
}

/** Remove all `<track>` elements previously attached to `video`. */
export function clearTextTracks(video: HTMLVideoElement): void {
  video.querySelectorAll('track').forEach((node) => node.remove());
}
