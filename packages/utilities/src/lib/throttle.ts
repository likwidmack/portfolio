/**
 * Returns a throttled function: invokes `callback` at most once per `delay` ms,
 * scheduling a trailing call when bursts exceed the interval.
 *
 * Exported from `@tgmc/utilities/browser` (timer-capable runtimes).
 *
 * @param callback - Logic to throttle
 * @param delay - Minimum spacing between invocations (ms), default `1000`
 *
 * @example
 * ```ts
 * const onScroll = throttle(() => update(), 100);
 * window.addEventListener('scroll', onScroll);
 * ```
 */
export function throttle(callback: (...args: any[]) => void, delay = 1000): (...args: any[]) => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastCall = 0;

  return (...args: any[]) => {
    const now = Date.now();

    const later = () => {
      lastCall = Date.now();
      timer = undefined;
      callback(...args);
    };

    if (now - lastCall >= delay) {
      if (timer !== undefined) clearTimeout(timer);
      later();
    } else if (timer === undefined) {
      timer = setTimeout(later, delay - (now - lastCall));
    }
  };
}

export default throttle;
