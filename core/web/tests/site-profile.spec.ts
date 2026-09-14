import { describe, expect, it } from 'vitest';

import { DEFAULT_APP_TITLE, mailtoHref, SITE_CONTACT_MAILTO, SITE_PERSON, SITE_PROFILE } from '../shared/site-profile';

describe('site profile content', () => {
  it('reads profile.json with formal, casual, and short names', () => {
    const profile = SITE_PROFILE;
    expect(profile.names.formal).toBe('Tamara Gisele Mack');
    expect(profile.names.casual).toBe('Tamara');
    expect(profile.names.short).toBe('TMack');
    expect(profile.names.signature).toBe('LIKWIDMACK');
    expect(profile.contact.email).toBe('likwidmack@gmail.com');
    expect(profile.contact.github.handle).toBe('tamaramack');
  });

  it('exposes module-scope constants aligned with profile.json', () => {
    expect(SITE_PERSON).toEqual(SITE_PROFILE.names);
    expect(DEFAULT_APP_TITLE).toBe('TMack Portfolio App');
    expect(SITE_CONTACT_MAILTO).toBe('mailto:likwidmack@gmail.com');
    expect(mailtoHref('a@b.co')).toBe('mailto:a@b.co');
  });
});
