// @vitest-environment node

import { describe, expect, it } from 'vitest';

import { isSvgSrc } from '../shared/is-svg-src';

describe('isSvgSrc', () => {
  it('matches .svg paths and query/hash suffixes', () => {
    expect(isSvgSrc('/img/a.svg')).toBe(true);
    expect(isSvgSrc('/img/a.SVG')).toBe(true);
    expect(isSvgSrc('/img/a.svg?v=1')).toBe(true);
    expect(isSvgSrc('/img/a.svg#layer')).toBe(true);
  });

  it('rejects rasters and non-svg extensions', () => {
    expect(isSvgSrc('/img/a.webp')).toBe(false);
    expect(isSvgSrc('/img/a.png')).toBe(false);
    expect(isSvgSrc('/img/svg-guide.md')).toBe(false);
    expect(isSvgSrc('')).toBe(false);
  });
});
