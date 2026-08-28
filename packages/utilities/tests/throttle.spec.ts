import throttle from '../src/lib/throttle.js';

describe('throttle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('invokes immediately on the first call', () => {
    const callback = vi.fn();
    const throttled = throttle(callback, 100);

    throttled('a');
    expect(callback).toHaveBeenCalledOnce();
    expect(callback).toHaveBeenCalledWith('a');
  });

  it('spaces subsequent calls by the delay', () => {
    const callback = vi.fn();
    const throttled = throttle(callback, 100);

    throttled('first');
    throttled('ignored-burst');
    vi.advanceTimersByTime(99);
    expect(callback).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback).toHaveBeenLastCalledWith('ignored-burst');
  });
});
