import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { isNavItemActive, linkStaysOnPage, PRIMARY_NAV_ITEMS } from '../shared/primary-nav';

const root = join(import.meta.dirname, '..');

describe('primary nav', () => {
  it('keeps the existing five-item rail (Process, Docs and AI Lab stay in the Work sub-nav)', () => {
    expect(PRIMARY_NAV_ITEMS.map((item) => item.label)).toEqual(['Work', 'About', 'Gallery', 'Writing', 'Code']);
  });

  it('marks nested routes active but not prefix siblings', () => {
    expect(isNavItemActive('/work', '/work')).toBe(true);
    expect(isNavItemActive('/work/media-systems', '/work')).toBe(true);
    expect(isNavItemActive('/workshop', '/work')).toBe(false);
  });

  it('a link stays on the page only for the exact current path (a parent of a child route navigates)', () => {
    expect(linkStaysOnPage('/work', '/work')).toBe(true);
    expect(linkStaysOnPage('/work/', '/work')).toBe(true);
    expect(linkStaysOnPage('/work/media-systems', '/work')).toBe(false);
    expect(linkStaysOnPage('/about', '/work')).toBe(false);
    expect(linkStaysOnPage('/', '/')).toBe(true);
  });

  it('shows inline links with aria-current, a header Personalize button and the contact CTA', async () => {
    const nav = await readFile(join(root, 'app/components/AppPrimaryNav/index.vue'), 'utf8');
    expect(nav).toContain('primary-nav__inline');
    expect(nav).toContain(':aria-current="item.active ? \'page\' : undefined"');
    expect(nav).toContain('aria-label="Personalize theme and background"');
    expect(nav).toContain('primary-nav__contact');
    expect(nav).not.toContain('primary-nav__panel-personalize');
    const scss = await readFile(join(root, 'app/components/AppPrimaryNav/AppPrimaryNav.scss'), 'utf8');
    expect(scss).toContain('@include bp-up(tablet)');
    // Header is blur only: one blur on the sticky wrapper, no tint/glow; the nav adds none.
    const bar = scss.slice(scss.indexOf('.primary-nav {'), scss.indexOf('&__brand'));
    expect(bar).not.toContain('backdrop-filter');
    expect(bar).toContain('background: transparent;');
    const site = await readFile(join(root, 'app/layouts/site.scss'), 'utf8');
    // Blur on ::before (pointer-events: none), never on the sticky header box itself —
    // Safari/iOS otherwise drops taps on Menu / Personalize / brand.
    const stickyHeaderMark = '// ─── Header: sticky, blur only';
    const stickyFooterMark = '// ─── Footer: slim';
    const headerRule = site.slice(site.indexOf(stickyHeaderMark), site.indexOf(stickyFooterMark));
    expect(headerRule).toContain('isolation: isolate;');
    expect(headerRule).toContain('&::before {');
    expect(headerRule).toMatch(/&::before \{[\s\S]*?pointer-events: none;[\s\S]*?backdrop-filter: blur\(14px\);/);
    // Sticky box must clear theme `.site-chrome` blur (`backdrop-blur(md)` → blur(8px)) —
    // any non-none filter on the sticky element re-triggers the Safari hit-test trap.
    const ruleBody = headerRule.slice(headerRule.indexOf('> header.site-chrome {'));
    const stickyBox = ruleBody.slice(0, ruleBody.indexOf('&::before {'));
    expect(stickyBox).toMatch(/^\s*-webkit-backdrop-filter:\s*none;/m);
    expect(stickyBox).toMatch(/^\s*backdrop-filter:\s*none;/m);
    expect(stickyBox).not.toMatch(/backdrop-filter:\s*blur\b/);
    expect(site).toContain('@media (prefers-reduced-transparency: reduce)');
    expect(site).toContain('@supports not ((backdrop-filter: blur(1px))');
  });

  it('closes the menu on outside clicks without stopping propagation', async () => {
    const nav = await readFile(join(root, 'app/components/AppPrimaryNav/index.vue'), 'utf8');
    // Page-wide listeners (analytics, …) must still see Menu clicks.
    expect(nav).not.toContain('@click.stop');
    expect(nav).toContain('@click="toggleMenu"');
    // Dispatch-time path: a re-rendered target inside the nav still counts as inside.
    expect(nav).toContain('event.composedPath().includes(navRoot.value)');
    // Personalize Done must not click-through onto Menu.
    expect(nav).toContain('data-personalize-open');
    expect(nav).toContain("menuOpen ? 'true' : 'false'");
    expect(nav).toContain('() => route.path');
    expect(nav).not.toContain('() => route.fullPath');
  });
});
