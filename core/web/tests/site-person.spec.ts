import { describe, expect, it } from 'vitest';

import { DEFAULT_APP_TITLE, SITE_PERSON } from '../shared/site-profile';

describe('site person identity', () => {
  it('exposes formal, casual, and short name variants', () => {
    expect(SITE_PERSON.formal).toBe('Tamara Gisele Mack');
    expect(SITE_PERSON.casual).toBe('Tamara');
    expect(SITE_PERSON.short).toBe('TMack');
    expect(SITE_PERSON.signature).toBe('LIKWIDMACK');
  });

  it('builds the default app title from the short name', () => {
    expect(DEFAULT_APP_TITLE).toBe('TMack Portfolio App');
  });
});
