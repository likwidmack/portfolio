/**
 * Returns a debounced function that delays invoking `callback` until `delay`
 * milliseconds have elapsed since the last call.
 *
 * When `immediate` is `true` (default), the callback runs on the leading edge
 * of the quiet period (first call in a burst), then waits for trailing silence.
 * When `false`, only the trailing edge runs.
 *
 * Exported from `@tgmc/utilities/browser` (also usable in any timer-capable runtime).
 *
 * @param callback - Function to debounce
 * @param delay - Quiet period in milliseconds (default `1000`)
 * @param immediate - Leading-edge invoke when `true` (default `true`)
 * @returns A function with the same argument list as `callback`
 *
 * @example
 * ```ts
 * const save = debounce((value: string) => persist(value), 100, false);
 * save('a');
 * save('b'); // only 'b' persists after 100ms
 * ```
 */
export function debounce(callback: (...args: any[]) => void, delay = 1000, immediate = true): (...args: any[]) => void {
  let timer: ReturnType<typeof setTimeout> | undefined;

  return (...args: any[]) => {
    const later = () => {
      timer = undefined;
      if (!immediate) callback(...args);
    };

    const callNow = immediate && timer === undefined;
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(later, delay);

    if (callNow) callback(...args);
  };
}

export default debounce;
