import type { AdCuePoint } from '../types.js';

/**
 * Time-based ad cue hooks without an ad SDK.
 *
 * Preroll cues fire on {@link firePreroll}; midroll cues fire once when
 * `currentTime` enters a short window around `cue.timeSeconds`.
 */
export class AdCueScheduler {
  private readonly active = new Set<string>();
  private destroyed = false;

  constructor(
    private readonly video: HTMLVideoElement,
    private readonly emitEnter: (cue: AdCuePoint) => void,
    private readonly emitExit: (cue: AdCuePoint) => void
  ) {}

  private cues: AdCuePoint[] = [];
  private onTimeUpdate: (() => void) | null = null;

  /** Replace midroll (and other) cues; clears active-enter bookkeeping. */
  setCues(cues: AdCuePoint[]): void {
    this.cues = [...cues].sort((a, b) => a.timeSeconds - b.timeSeconds);
    this.active.clear();
  }

  /** Emit enter for each preroll cue that has not already fired this session. */
  firePreroll(cues: AdCuePoint[]): void {
    for (const cue of cues.filter((c) => c.kind === 'preroll')) {
      if (!this.active.has(cue.id)) {
        this.active.add(cue.id);
        this.emitEnter(cue);
      }
    }
  }

  /** Listen to `timeupdate` for midroll enter/exit. */
  attach(): void {
    this.detach();
    this.onTimeUpdate = () => {
      if (this.destroyed) {
        return;
      }
      const t = this.video.currentTime;
      for (const cue of this.cues) {
        if (cue.kind !== 'midroll') {
          continue;
        }
        const entered = t >= cue.timeSeconds && t < cue.timeSeconds + 0.25;
        if (entered && !this.active.has(cue.id)) {
          this.active.add(cue.id);
          this.emitEnter(cue);
        } else if (!entered && this.active.has(cue.id) && t >= cue.timeSeconds + 0.25) {
          this.active.delete(cue.id);
          this.emitExit(cue);
        }
      }
    };
    this.video.addEventListener('timeupdate', this.onTimeUpdate);
  }

  detach(): void {
    if (this.onTimeUpdate) {
      this.video.removeEventListener('timeupdate', this.onTimeUpdate);
      this.onTimeUpdate = null;
    }
  }

  destroy(): void {
    this.destroyed = true;
    this.detach();
    this.active.clear();
  }
}
