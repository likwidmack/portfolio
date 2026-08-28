import type { PlaylistInput } from '../types.js';
import { MediaAsset } from './media-asset.js';

/**
 * Ordered {@link MediaAsset} list with cursor and continuous-play flag.
 */
export class Playlist {
  readonly items: MediaAsset[];
  /** When true, the player advances on `ended`. */
  readonly continuousPlay: boolean;
  private index: number;

  constructor(input: PlaylistInput) {
    this.items = input.items.map((item) => new MediaAsset(item));
    this.continuousPlay = input.continuousPlay ?? false;
    this.index = input.startIndex ?? 0;
    if (this.index < 0 || this.index >= this.items.length) {
      this.index = 0;
    }
  }

  /** Asset at the current index, or `null` if empty. */
  current(): MediaAsset | null {
    return this.items[this.index] ?? null;
  }

  currentIndex(): number {
    return this.index;
  }

  hasNext(): boolean {
    return this.index + 1 < this.items.length;
  }

  /** Advance the cursor and return the new current asset, or `null` at end. */
  next(): MediaAsset | null {
    if (!this.hasNext()) {
      return null;
    }
    this.index += 1;
    return this.current();
  }

  /** Jump to `index` when in range; otherwise leave cursor unchanged and return `null`. */
  setIndex(index: number): MediaAsset | null {
    if (index < 0 || index >= this.items.length) {
      return null;
    }
    this.index = index;
    return this.current();
  }
}

/** Factory matching the public export style. */
export function createPlaylist(input: PlaylistInput): Playlist {
  return new Playlist(input);
}
