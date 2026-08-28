import { toSnakeCase } from '../src/lib/to-snake-case.js';

describe('toSnakeCase', () => {
  it('inserts underscores before uppercase runs and lowercases', () => {
    expect(toSnakeCase('fooBarBaz')).toBe('foo_bar_baz');
    expect(toSnakeCase('already_snake')).toBe('already_snake');
    expect(toSnakeCase('Simple')).toBe('simple');
  });
});
