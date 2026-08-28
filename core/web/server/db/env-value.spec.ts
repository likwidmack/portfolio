// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { nonEmpty } from './env-value';

describe('nonEmpty', () => {
  it('returns undefined for nullish and blank strings', () => {
    expect(nonEmpty(undefined)).toBeUndefined();
    expect(nonEmpty(null)).toBeUndefined();
    expect(nonEmpty('')).toBeUndefined();
    expect(nonEmpty('   ')).toBeUndefined();
  });

  it('trims and returns non-empty values', () => {
    expect(nonEmpty('us-west-2')).toBe('us-west-2');
    expect(nonEmpty('  postgres://db  ')).toBe('postgres://db');
  });
});
