import { mailtoHref, type SiteProfile, type SiteSocialLink } from './site-profile';

/** A social / contact link ready to render: external links open in a new tab and say so. */
export type SocialLinkItem = Omit<SiteSocialLink, 'href'> & {
  href: string;
  external: boolean;
  /** Accessible name — adds "(opens in a new tab)" for external links. */
  accessibleName: string;
};

export type SocialLinksOptions = {
  /** Append the contact email (`mailto:`) as the last link. Default `true`. */
  includeEmail?: boolean;
};

/** Entries with a value. `null` / empty entries stay in `profile.json` but never reach UI or SEO. */
function withHref(links: SiteSocialLink[] | undefined): Array<SiteSocialLink & { href: string }> {
  return (links ?? []).filter(
    (link): link is SiteSocialLink & { href: string } => typeof link.href === 'string' && link.href.trim() !== ''
  );
}

/**
 * Social + reference links from the site profile (`contact.social`), plus the contact email.
 * Only entries with an `href` are returned. Code/doc references must point at the public mirror
 * (likwidmack/portfolio) — see `shared/public-repo.ts` and `tests/public-repo-links.spec.ts`.
 */
export function socialLinks(profile: SiteProfile, options: SocialLinksOptions = {}): SocialLinkItem[] {
  const { includeEmail = true } = options;
  const links: Array<SiteSocialLink & { href: string }> = withHref(profile.contact.social);
  if (includeEmail) {
    links.push({
      id: 'email',
      label: 'Email',
      href: mailtoHref(profile.contact.email),
      icon: 'mail',
      kind: 'reference',
    });
  }
  return links.map((link) => {
    const external = /^https?:\/\//i.test(link.href);
    return { ...link, external, accessibleName: external ? `${link.label} (opens in a new tab)` : link.label };
  });
}

/** JSON-LD `sameAs`: identity profiles with a value (never `null` entries or reference links). */
export function profileSameAs(profile: SiteProfile): string[] {
  const urls = withHref(profile.contact.social)
    .filter((link) => (link.kind ?? 'profile') === 'profile')
    .map((link) => link.href);
  if (profile.contact.website) urls.push(profile.contact.website);
  return [...new Set(urls.length ? urls : [profile.contact.github.url])];
}

/** Optional JSON-LD Person fields — only those with a value are emitted. */
export function personContactJsonLd(profile: SiteProfile): Record<string, string> {
  const { phone, location } = profile.contact;
  const out: Record<string, string> = {};
  if (phone) out.telephone = phone;
  if (location) out.homeLocation = location;
  return out;
}
