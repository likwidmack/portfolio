import debounce from '../src/lib/debounce.js';

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('invokes immediately once per quiet period by default', () => {
    const callback = vi.fn();
    const debounced = debounce(callback, 100);

    debounced('first');
    debounced('second');
    vi.advanceTimersByTime(100);
    debounced('third');

    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback).toHaveBeenNthCalledWith(1, 'first');
    expect(callback).toHaveBeenNthCalledWith(2, 'third');
  });

  it('invokes with the latest arguments after the delay when immediate is false', () => {
    const callback = vi.fn();
    const debounced = debounce(callback, 100, false);

    debounced('first');
    vi.advanceTimersByTime(50);
    debounced('latest');
    vi.advanceTimersByTime(99);

    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);

    expect(callback).toHaveBeenCalledOnce();
    expect(callback).toHaveBeenCalledWith('latest');
  });
});
