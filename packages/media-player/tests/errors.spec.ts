import { describe, expect, it } from 'vitest';

import { MediaAsset } from '../src/lib/domain/media-asset.js';
import { ErrorCodes, MediaPlayerError } from '../src/lib/errors.js';

describe('MediaAsset', () => {
  it('requires a url', () => {
    expect(() => new MediaAsset({ url: '', kind: 'progressive' })).toThrow();
  });
});

describe('MediaPlayerError', () => {
  it('exposes stable error codes', () => {
    const error = new MediaPlayerError(ErrorCodes.LOAD_FAILED, 'failed');
    expect(error.code).toBe('load_failed');
    expect(error.name).toBe('MediaPlayerError');
  });
});
