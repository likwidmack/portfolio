// @vitest-environment node

import { describe, expect, it } from 'vitest';

import { isSvgSrc } from '../shared/is-svg-src';

describe('isSvgSrc', () => {
  it('matches .svg paths and query/hash suffixes', () => {
    expect(isSvgSrc('/i/a.svg')).toBe(true);
    expect(isSvgSrc('/i/a.SVG')).toBe(true);
    expect(isSvgSrc('/i/a.svg?v=1')).toBe(true);
    expect(isSvgSrc('/i/a.svg#layer')).toBe(true);
  });

  it('rejects rasters and non-svg extensions', () => {
    expect(isSvgSrc('/i/a.webp')).toBe(false);
    expect(isSvgSrc('/i/a.png')).toBe(false);
    expect(isSvgSrc('/i/svg-guide.md')).toBe(false);
    expect(isSvgSrc('')).toBe(false);
  });
});
