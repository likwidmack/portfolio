/**
 * Runtime-neutral aspect-ratio helpers (SSR + browser safe).
 */

export type AspectRatio = {
  /** Positive integer width component after reduction (when reducible). */
  width: number;
  /** Positive integer height component after reduction (when reducible). */
  height: number;
  /** `width / height` as a finite number. */
  ratio: number;
  /** CSS `aspect-ratio` value, e.g. `"16 / 9"`. */
  css: string;
};

function gcd(a: number, b: number): number {
  let x = Math.abs(Math.trunc(a));
  let y = Math.abs(Math.trunc(b));
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

/**
 * Normalize a width/height pair into a reduced aspect ratio and CSS string.
 *
 * Non-finite or non-positive inputs yield `{ width: 1, height: 1, ratio: 1, css: '1 / 1' }`.
 */
export function aspectRatio(width: number, height: number): AspectRatio {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return { width: 1, height: 1, ratio: 1, css: '1 / 1' };
  }

  const w = Math.round(width);
  const h = Math.round(height);
  const d = gcd(w, h);
  const rw = Math.max(1, Math.round(w / d));
  const rh = Math.max(1, Math.round(h / d));

  return {
    width: rw,
    height: rh,
    ratio: rw / rh,
    css: `${rw} / ${rh}`,
  };
}

export default aspectRatio;
