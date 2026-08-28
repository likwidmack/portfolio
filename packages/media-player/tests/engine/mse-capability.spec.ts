import { describe, expect, it } from 'vitest';

import { getMseConstructor, isMseSupported } from '../../src/lib/engine/mse-capability.js';

describe('mse-capability', () => {
  it('prefers ManagedMediaSource when present', () => {
    class MockMMS {}
    class MockMS {}
    const ctor = getMseConstructor({
      ManagedMediaSource: MockMMS as unknown as typeof MediaSource,
      MediaSource: MockMS as unknown as typeof MediaSource,
    });
    expect(ctor).toBe(MockMMS);
  });

  it('reports unsupported when no MSE', () => {
    expect(isMseSupported('video/mp4; codecs="avc1.42E01E,mp4a.40.2"', {})).toBe(false);
  });
});
