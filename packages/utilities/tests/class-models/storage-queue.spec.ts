import StorageQueue from '../../src/lib/class-models/storage-queue.js';

describe('StorageQueue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('enqueues, dequeues, and peeks in FIFO order', () => {
    const queue = new StorageQueue<number>();

    expect(queue.length).toBe(0);
    expect(queue.peek()).toBeUndefined();

    queue.enqueue(1);
    queue.enqueue(2);

    expect(queue.length).toBe(2);
    expect(queue.peek()).toBe(1);
    expect(queue.dequeue()).toBe(1);
    expect(queue.peek()).toBe(2);
    expect(queue.dequeue()).toBe(2);
    expect(queue.dequeue()).toBeUndefined();
    expect(queue.length).toBe(0);
  });

  it('processes each item in order, one item per macrotask', async () => {
    const queue = new StorageQueue(['a', 'b', 'c']);
    const seen: string[] = [];

    queue.process((item) => seen.push(item));

    expect(seen).toEqual(['a']);

    await vi.runAllTimersAsync();

    expect(seen).toEqual(['a', 'b', 'c']);
    expect(queue.length).toBe(0);
  });

  it('does not process an empty queue', () => {
    const callback = vi.fn();

    new StorageQueue<number>().process(callback);

    expect(callback).not.toHaveBeenCalled();
  });

  it('ignores an overlapping process call', async () => {
    const queue = new StorageQueue([1, 2]);
    const first = vi.fn();
    const second = vi.fn();

    queue.process(first);
    queue.process(second);
    await vi.runAllTimersAsync();

    expect(first).toHaveBeenNthCalledWith(1, 1);
    expect(first).toHaveBeenNthCalledWith(2, 2);
    expect(second).not.toHaveBeenCalled();
  });

  it('clears the queue and permits a new processing cycle', async () => {
    const queue = new StorageQueue([1, 2, 3]);
    const seen: number[] = [];

    queue.process((item) => {
      seen.push(item);
      if (item === 1) queue.clear();
    });
    await vi.runAllTimersAsync();

    expect(seen).toEqual([1]);
    expect(queue.length).toBe(0);

    queue.enqueue(10);
    queue.process((item) => seen.push(item));
    await vi.runAllTimersAsync();

    expect(seen).toEqual([1, 10]);
  });

  it('clear mid-drain prevents stale drain from consuming the next cycle', async () => {
    const queue = new StorageQueue(['old-a', 'old-b']);
    const oldCycle = vi.fn();
    const newCycle = vi.fn();

    queue.process((item) => {
      oldCycle(item);
      if (item === 'old-a') {
        queue.clear();
        queue.enqueue('new-x');
        queue.enqueue('new-y');
        queue.process(newCycle);
      }
    });

    expect(oldCycle).toHaveBeenCalledWith('old-a');
    expect(newCycle).toHaveBeenCalledTimes(1);
    expect(newCycle).toHaveBeenCalledWith('new-x');

    await vi.runAllTimersAsync();

    expect(oldCycle).toHaveBeenCalledTimes(1);
    expect(oldCycle).not.toHaveBeenCalledWith('old-b');
    expect(newCycle).toHaveBeenCalledTimes(2);
    expect(newCycle).toHaveBeenNthCalledWith(1, 'new-x');
    expect(newCycle).toHaveBeenNthCalledWith(2, 'new-y');
  });
});
