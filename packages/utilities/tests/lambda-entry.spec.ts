import { deepAssign, EventsHandler, isNodeEnv, Logging } from '../src/index.js';

describe('@tgmc/utilities default entry (Node / Lambda)', () => {
  it('imports without touching window/document', () => {
    expect(typeof window).toBe('undefined');
    expect(isNodeEnv()).toBe(true);
    expect(deepAssign({ a: 1 }, { b: 2 })).toEqual({ a: 1, b: 2 });
    expect(new EventsHandler()).toBeInstanceOf(EventsHandler);
    expect(Logging).toBeTypeOf('function');
  });
});
