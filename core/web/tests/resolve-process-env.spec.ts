// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { firstNonEmptyEnv } from '../resolve-process-env';

describe('firstNonEmptyEnv', () => {
  it('prefers the first non-empty key', () => {
    expect(
      firstNonEmptyEnv(
        { NUXT_DATABASE_URL: 'nuxt://db', DATABASE_URL: 'plain://db' },
        'NUXT_DATABASE_URL',
        'DATABASE_URL'
      )
    ).toBe('nuxt://db');
    expect(firstNonEmptyEnv({ DATABASE_URL: 'plain://db' }, 'NUXT_DATABASE_URL', 'DATABASE_URL')).toBe('plain://db');
  });

  it('skips blank values', () => {
    expect(firstNonEmptyEnv({ NUXT_AWS_REGION: '', AWS_REGION: 'us-west-2' }, 'NUXT_AWS_REGION', 'AWS_REGION')).toBe(
      'us-west-2'
    );
    expect(firstNonEmptyEnv({ A: '  ', B: '' }, 'A', 'B')).toBeUndefined();
  });
});
