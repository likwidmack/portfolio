import deepAssign from '../src/lib/deepAssign.js';

describe('deepAssign', () => {
  it('merges plain objects recursively', () => {
    expect(deepAssign({ a: { x: 1 } }, { a: { y: 2 }, b: 3 })).toEqual({
      a: { x: 1, y: 2 },
      b: 3,
    });
  });

  it('merges arrays via unique concat', () => {
    expect(deepAssign({ tags: [1, 2] }, { tags: [2, 3] })).toEqual({ tags: [1, 2, 3] });
  });

  it('assigns into class instances', () => {
    class Box {
      nested = { n: 1 };
    }
    const box = new Box();
    deepAssign(box, { nested: { n: 2, m: 3 } });
    expect(box.nested).toEqual({ n: 2, m: 3 });
    expect(box).toBeInstanceOf(Box);
  });
});
