import { SITE_PROFILE, type SiteProfile } from '#shared/site-profile';

/**
 * Site owner profile from `content/profile.json` (Nuxt Content `profile` collection).
 * Uses the validated JSON on disk so server, client, and `nuxt.config` share one source.
 */
export function useSiteProfile() {
  const profile = useState<SiteProfile>('site-profile', () => SITE_PROFILE);
  return { profile };
}
