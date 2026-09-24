import { describe, expect, it } from 'vitest';

import {
  DEFAULT_APP_TITLE,
  documentTitleForPath,
  mailtoHref,
  SITE_CONTACT_MAILTO,
  SITE_PERSON,
  SITE_PROFILE,
  stripTitleSuffix,
} from '../shared/site-profile';

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

  it('omits Portfolio App billing from splash document titles', () => {
    expect(documentTitleForPath('LIKWIDMACK', '/')).toBe('LIKWIDMACK');
    expect(documentTitleForPath('LIKWIDMACK · Portfolio App', '/splash')).toBe('LIKWIDMACK');
    expect(documentTitleForPath(DEFAULT_APP_TITLE, '/')).toBe('TMack');
    expect(documentTitleForPath('About — Tamara Gisele Mack', '/about')).toBe('About — Tamara Gisele Mack');
  });

  it('escapes regex metacharacters in a configurable title suffix', () => {
    expect(stripTitleSuffix('Home (beta)', '(beta)')).toBe('Home');
    expect(stripTitleSuffix('Home · Portfolio (App)', 'Portfolio (App)')).toBe('Home');
    expect(stripTitleSuffix('TMack Portfolio App', 'Portfolio App')).toBe('TMack');
    expect(stripTitleSuffix('FooPortfolio App', 'Portfolio App')).toBe('FooPortfolio App');
  });
});
