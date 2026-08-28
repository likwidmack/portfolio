/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';

import { AdCueScheduler } from '../../src/lib/domain/ad-cue.js';

describe('AdCueScheduler', () => {
  it('fires preroll enter once per cue', () => {
    const video = document.createElement('video');
    const entered: string[] = [];
    const scheduler = new AdCueScheduler(
      video,
      (cue) => entered.push(cue.id),
      () => undefined
    );
    const cues = [{ id: 'pre-1', timeSeconds: 0, kind: 'preroll' as const }];
    scheduler.firePreroll(cues);
    scheduler.firePreroll(cues);
    expect(entered).toEqual(['pre-1']);
  });

  it('fires midroll enter on timeupdate window', () => {
    const video = document.createElement('video');
    const entered: string[] = [];
    const scheduler = new AdCueScheduler(
      video,
      (cue) => entered.push(cue.id),
      () => undefined
    );
    scheduler.setCues([{ id: 'mid-1', timeSeconds: 10, kind: 'midroll' }]);
    scheduler.attach();
    Object.defineProperty(video, 'currentTime', { value: 10.1, configurable: true });
    video.dispatchEvent(new Event('timeupdate'));
    expect(entered).toContain('mid-1');
    scheduler.destroy();
  });
});
