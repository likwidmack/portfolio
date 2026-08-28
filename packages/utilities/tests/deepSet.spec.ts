import deepSet from '../src/lib/deepSet.js';

describe('deepSet', () => {
  it('uniquely merges arrays', () => {
    expect(deepSet([1, 2], [2, 3], [3, 4])).toEqual([1, 2, 3, 4]);
  });
});
