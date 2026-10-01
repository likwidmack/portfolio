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
  it('exposes required profile shape from profile.json', () => {
    const profile = SITE_PROFILE;
    expect(profile.names.formal.length).toBeGreaterThan(0);
    expect(profile.names.casual.length).toBeGreaterThan(0);
    expect(profile.names.short.length).toBeGreaterThan(0);
    expect(profile.names.signature.length).toBeGreaterThan(0);
    expect(profile.contact.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    expect(profile.contact.github.handle.length).toBeGreaterThan(0);
    expect(profile.contact.github.url).toMatch(/^https?:\/\//);
    expect(profile.app.titleSuffix.length).toBeGreaterThan(0);
    expect(profile.app.siteDescription.length).toBeGreaterThan(0);
  });

  it('exposes module-scope constants derived from profile.json', () => {
    expect(SITE_PERSON).toEqual(SITE_PROFILE.names);
    expect(DEFAULT_APP_TITLE).toBe(`${SITE_PROFILE.names.short} ${SITE_PROFILE.app.titleSuffix}`);
    expect(SITE_CONTACT_MAILTO).toBe(mailtoHref(SITE_PROFILE.contact.email));
    expect(mailtoHref('a@b.co')).toBe('mailto:a@b.co');
  });

  it('omits Portfolio App billing from splash document titles', () => {
    const signature = SITE_PROFILE.names.signature;
    expect(documentTitleForPath(signature, '/')).toBe(signature);
    expect(documentTitleForPath(`${signature} · Portfolio App`, '/splash')).toBe(signature);
    expect(documentTitleForPath(DEFAULT_APP_TITLE, '/')).toBe(SITE_PROFILE.names.short);
    expect(documentTitleForPath(`About — ${SITE_PROFILE.names.formal}`, '/about')).toBe(
      `About — ${SITE_PROFILE.names.formal}`
    );
  });

  it('escapes regex metacharacters in a configurable title suffix', () => {
    expect(stripTitleSuffix('Home (beta)', '(beta)')).toBe('Home');
    expect(stripTitleSuffix('Home · Portfolio (App)', 'Portfolio (App)')).toBe('Home');
    expect(stripTitleSuffix(DEFAULT_APP_TITLE, SITE_PROFILE.app.titleSuffix)).toBe(SITE_PROFILE.names.short);
    expect(stripTitleSuffix('FooPortfolio App', 'Portfolio App')).toBe('FooPortfolio App');
  });
});
