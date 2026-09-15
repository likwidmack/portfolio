/**
 * Personal name helpers — sourced from `content/profile.json` via {@link SITE_PROFILE}.
 * Prefer `useSiteProfile()` in Vue when you need the full profile; use these exports for titles and SEO strings.
 */
import type { SiteProfileNames } from './site-profile';

export {
  DEFAULT_APP_TITLE,
  mailtoHref,
  SITE_CONTACT_MAILTO,
  SITE_PERSON,
  SITE_PROFILE,
  type SiteProfile,
  type SiteProfileContact,
  type SiteProfileNames,
  type SiteProfileRole,
} from './site-profile';

export type SitePersonNameVariant = keyof Pick<SiteProfileNames, 'formal' | 'casual' | 'short'>;
