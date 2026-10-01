import { aspectRatio } from '../src/lib/aspect-ratio.js';

describe('aspectRatio', () => {
  it('reduces integer pairs and emits CSS', () => {
    expect(aspectRatio(1920, 1080)).toEqual({
      width: 16,
      height: 9,
      ratio: 16 / 9,
      css: '16 / 9',
    });
  });

  it('falls back for invalid input', () => {
    expect(aspectRatio(0, 10)).toEqual({ width: 1, height: 1, ratio: 1, css: '1 / 1' });
    expect(aspectRatio(Number.NaN, 4)).toEqual({ width: 1, height: 1, ratio: 1, css: '1 / 1' });
  });
});
