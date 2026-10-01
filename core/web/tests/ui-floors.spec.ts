// @vitest-environment node

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { PUBLIC_REPO } from '../shared/public-repo';
import type { SiteProfile } from '../shared/site-profile';
import { SITE_PROFILE } from '../shared/site-profile';
import { personContactJsonLd, profileSameAs, socialLinks } from '../shared/social-links';

const web = join(import.meta.dirname, '..');
const theme = join(web, '../../theme/core/scss');
const read = (path: string) => readFileSync(path, 'utf8');

describe('theme floors: responsive · accessible · touch', () => {
  it('defines 44px touch and 12px type floors and keeps phone body text at 16px', () => {
    const root = read(join(theme, 'globals/_root.scss'));
    expect(root).toContain('--touch-target: max(2.75rem, 44px);');
    expect(root).toContain('--type-min: max(0.75rem, 12px);');
    expect(root).toContain('--form-control-height: max(var(--touch-target), 2.5rem);');
    expect(root).not.toContain('$font-size-default * 0.75');
    // % root: the reader's browser text size applies (a px root overrides it).
    expect(root).toContain('--font-size-default: 100%;');
    expect(root).toContain('--font-size-default: 125%;');
    expect(root).toContain('--font-size-xs: clamp(max(var(--type-min, 12px), 0.7rem)');
  });

  it('ships touch-target / font-size-floor mixins and theme utilities', () => {
    const mixins = read(join(theme, 'globals/_mixins.scss'));
    expect(mixins).toContain('@mixin touch-target(');
    expect(mixins).toContain('@mixin font-size-floor(');
    expect(read(join(web, 'assets/css/_mixins.scss'))).toContain(
      "@forward 'theme/scss/globals/mixins' show touch-target, font-size-floor, bp, bp-up, bp-down, bp-between;"
    );
    const classes = read(join(theme, 'globals/_class-selectors.scss'));
    expect(classes).toContain('.touch-target {');
    expect(classes).toContain('.back-link {');
  });

  it('theme controls meet the touch target and keep focus visible', () => {
    const button = read(join(theme, 'globals/_button.scss'));
    expect(button).not.toMatch(/min-height: 2\.(1|25)rem/);
    expect(read(join(theme, 'tokens/_button-mixins.scss'))).not.toContain('min-height: 2rem;');
    expect(read(join(theme, 'globals/_primevue-union.scss'))).toMatch(
      /\.p-tabs \.p-tab \{\s*min-height: var\(--touch-target, 44px\);/
    );
    expect(read(join(theme, 'globals/_form.scss'))).toContain("label:has(input[type='checkbox'], input[type='radio'])");
    // `.page-nav` moved from the theme to its component (theme stays universal).
    const pageNav = read(join(web, 'app/components/AppPageNav/AppPageNav.scss'));
    expect(pageNav).not.toMatch(/outline: none;/);
    expect(pageNav).toContain('min-height: var(--touch-target, 44px);');
    expect(read(join(web, 'app/components/AppWorkSubNav.vue'))).toContain('src="./AppPageNav/AppPageNav.scss"');
  });

  it('no stylesheet hard-codes text below the type floor', () => {
    const offenders: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) {
          if (!['node_modules', '_archive', '.nuxt', '.output'].includes(entry.name)) walk(path);
        } else if (/\.(scss|vue)$/.test(entry.name)) {
          for (const m of read(path).matchAll(
            /font-size:\s*(0\.(?:[0-6]\d*|7(?:[0-4]\d*)?)rem|(?:[5-9]|1[01])px)\s*;/g
          )) {
            offenders.push(`${path}: ${m[0]}`);
          }
        }
      }
    };
    walk(join(web, 'app'));
    walk(join(web, 'assets'));
    walk(theme);
    expect(offenders).toEqual([]);
  });

  it('archives the replaced styling instead of deleting it (not compiled)', () => {
    const archive = join(theme, '_archive/2026-09-24-pre-a11y');
    expect(existsSync(join(archive, 'README.md'))).toBe(true);
    expect(existsSync(join(archive, 'theme/core/scss/globals/_root.scss'))).toBe(true);
    expect(existsSync(join(archive, 'pre-169/core/web/app/layouts/site.scss'))).toBe(true);
    const index = read(join(theme, 'index.scss')) + read(join(theme, 'globals/_index.scss'));
    expect(index).not.toContain('_archive');
  });
});

describe('footer + social links', () => {
  it('builds social links from the profile, with the public source repo and email', () => {
    const links = socialLinks(SITE_PROFILE);
    expect(links.map((l) => l.id)).toEqual(['github', 'source', 'email']);
    expect(links.find((l) => l.id === 'source')?.href).toBe(PUBLIC_REPO.url);
    expect(links.find((l) => l.id === 'email')?.href).toBe(`mailto:${SITE_PROFILE.contact.email}`);
    const github = links.find((l) => l.id === 'github')!;
    expect(github.external).toBe(true);
    expect(github.accessibleName).toBe('GitHub (opens in a new tab)');
    expect(socialLinks(SITE_PROFILE, { includeEmail: false }).some((l) => l.id === 'email')).toBe(false);
  });

  it('profile.json centralizes every entry; null entries never reach UI or SEO', () => {
    const social = SITE_PROFILE.contact.social ?? [];
    expect(social.length).toBeGreaterThan(20);
    expect(social.some((l) => l.href === null)).toBe(true);
    const shown = socialLinks(SITE_PROFILE).map((l) => l.id);
    for (const entry of social.filter((l) => l.href === null)) expect(shown).not.toContain(entry.id);
    const sameAs = profileSameAs(SITE_PROFILE);
    expect(sameAs).toEqual(['https://github.com/tamaramack']);
    expect(sameAs).not.toContain(PUBLIC_REPO.url); // reference links are UI-only
    expect(personContactJsonLd(SITE_PROFILE)).toEqual({});
    for (const key of ['phone', 'website', 'location', 'booking'] as const) {
      expect(key in SITE_PROFILE.contact).toBe(true);
    }
    // Filling a value turns it on everywhere.
    const filled: SiteProfile = {
      ...SITE_PROFILE,
      contact: {
        ...SITE_PROFILE.contact,
        phone: '+1 555 0100',
        social: social.map((l) => (l.id === 'linkedin' ? { ...l, href: 'https://www.linkedin.com/in/example' } : l)),
      },
    };
    expect(socialLinks(filled).map((l) => l.id)).toContain('linkedin');
    expect(profileSameAs(filled)).toContain('https://www.linkedin.com/in/example');
    expect(personContactJsonLd(filled)).toEqual({ telephone: '+1 555 0100' });
    const layout = read(join(web, 'app/layouts/site.vue'));
    expect(layout).toContain('sameAs: profileSameAs(profile.value)');
    expect(layout).toContain('...personContactJsonLd(profile.value)');
  });

  it('bundles every social icon (filled or not) for web and admin', () => {
    const icons = [...(SITE_PROFILE.contact.social ?? []).map((l) => l.icon), 'mail', 'contrast'];
    for (const config of ['nuxt.config.ts', '../admin/nuxt.config.ts']) {
      const src = read(join(web, config));
      for (const icon of icons) expect(src).toContain(`'lucide:${icon}'`);
    }
  });

  it('AppSocialLinks: 44px targets, new-tab announcement, visible labels by default', () => {
    const src = read(join(web, 'app/components/AppSocialLinks.vue'));
    expect(src).toContain("variant: 'labels'");
    expect(src).toContain('@include touch-target;');
    expect(src).toContain('(opens in a new tab)');
    expect(src).toContain('rel="link.external ? \'noopener noreferrer\' : undefined"');
    expect(src).not.toContain('title=');
  });

  it('footer is slim, responsive and uses the social links', () => {
    const vue = read(join(web, 'app/layouts/site.vue'));
    expect(vue).toContain('AppSocialLinks.site-footer__social');
    const scss = read(join(web, 'app/layouts/site.scss'));
    expect(scss).toMatch(/\.site-footer \{[\s\S]*?padding: 0\.25rem var\(--page-pad, 1rem\);/);
    // Personalize is header-only; the footer keeps credit + social links.
    expect(vue).not.toContain('site-footer__personalize');
    expect(scss).not.toContain('.site-footer__personalize');
    // Sticky footer: the page shell (layout layer — moved out of the theme) is a min-100dvh
    // column and main takes the slack.
    expect(scss).toMatch(/\.app-site-layout \{[\s\S]*?flex-direction: column;[\s\S]*?min-height: 100dvh;/);
    expect(scss).toMatch(/> main \{[\s\S]*?flex: 1 1 auto;/);
    expect(read(join(theme, '_layout.scss'))).not.toContain('site_page');
  });
});
