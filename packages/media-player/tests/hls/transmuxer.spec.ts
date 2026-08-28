import { describe, expect, it } from 'vitest';

import { needsTransmux } from '../../src/lib/hls/transmuxer.js';

describe('transmuxer helpers', () => {
  it('detects TS segment URIs', () => {
    expect(needsTransmux('segment00001.ts')).toBe(true);
    expect(needsTransmux('chunk.m4s')).toBe(false);
  });
});
