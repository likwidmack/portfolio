import { describe, expect, it } from 'vitest';

import { DEFAULT_APP_TITLE, SITE_PERSON, SITE_PROFILE } from '../shared/site-profile';

describe('site person identity', () => {
  it('aliases SITE_PERSON to profile.json names', () => {
    expect(SITE_PERSON).toEqual(SITE_PROFILE.names);
    expect(SITE_PERSON.formal.length).toBeGreaterThan(0);
    expect(SITE_PERSON.casual.length).toBeGreaterThan(0);
    expect(SITE_PERSON.short.length).toBeGreaterThan(0);
    expect(SITE_PERSON.signature.length).toBeGreaterThan(0);
  });

  it('builds the default app title from short name and title suffix', () => {
    expect(DEFAULT_APP_TITLE).toBe(`${SITE_PROFILE.names.short} ${SITE_PROFILE.app.titleSuffix}`);
  });
});
