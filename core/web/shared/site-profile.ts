import profileJson from '../content/profile.json';

export type SiteProfileNames = {
  formal: string;
  casual: string;
  short: string;
  signature: string;
};

export type SiteProfileContact = {
  email: string;
  github: {
    handle: string;
    url: string;
  };
};

export type SiteProfileRole = {
  title: string;
  organization: string;
  footerCredential: string;
  creativeTechnologist: string;
  jsonLdDescription: string;
};

export type SiteProfile = {
  names: SiteProfileNames;
  contact: SiteProfileContact;
  role: SiteProfileRole;
  portrait: {
    src: string;
    width: number;
    height: number;
  };
  downloads: {
    portfolioDeck: string;
    generalResume: string;
  };
  copyright: {
    startYear: number;
    displayYear: number;
  };
  app: {
    titleSuffix: string;
    siteDescription: string;
  };
};

/** Profile content doc (`profile` Nuxt Content collection), bundled for Nitro and `nuxt.config`. */
export const SITE_PROFILE = profileJson as SiteProfile;

/** Name variants derived from the profile content doc. */
export const SITE_PERSON: SiteProfileNames = SITE_PROFILE.names;

/** Default portfolio app title: `{short} {titleSuffix}`. */
export const DEFAULT_APP_TITLE = `${SITE_PROFILE.names.short} ${SITE_PROFILE.app.titleSuffix}`;

export function mailtoHref(email: string): string {
  return `mailto:${email}`;
}

export const SITE_CONTACT_MAILTO = mailtoHref(SITE_PROFILE.contact.email);
