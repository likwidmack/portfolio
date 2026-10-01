import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { isNavItemActive, PRIMARY_NAV_ITEMS } from '../shared/primary-nav';

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

  it('shows inline links with aria-current, a header Personalize button and the contact CTA', async () => {
    const nav = await readFile(join(root, 'app/components/AppPrimaryNav/index.vue'), 'utf8');
    expect(nav).toContain('primary-nav__inline');
    expect(nav).toContain(':aria-current="item.active ? \'page\' : undefined"');
    expect(nav).toContain('aria-label="Personalize theme and background"');
    expect(nav).toContain('primary-nav__contact');
    expect(nav).not.toContain('primary-nav__panel-personalize');
    // Phone sheet: Escape dismisses; no document click-outside (raced Cypress open).
    // toggleMenu + short lock after Personalize closes (modal click-through onto Menu).
    expect(nav).toContain('@click.stop="toggleMenu"');
    expect(nav).toContain('function toggleMenu');
    expect(nav).toContain('lockMenuToggleForCloseGesture');
    expect(nav).toContain("menuOpen ? 'true' : 'false'");
    expect(nav).toContain("document.addEventListener('keydown', onKeydown)");
    expect(nav).not.toContain('onDocumentClick');
    expect(nav).not.toContain('onDocumentPointerDown');
    expect(nav).not.toContain('bindDismissListeners');
    const scss = await readFile(join(root, 'app/components/AppPrimaryNav/AppPrimaryNav.scss'), 'utf8');
    expect(scss).toContain('@include bp-up(tablet)');
    // Header is blur only: one blur on the sticky wrapper, no tint/glow; the nav adds none.
    const bar = scss.slice(scss.indexOf('.primary-nav {'), scss.indexOf('&__brand'));
    expect(bar).not.toContain('backdrop-filter');
    expect(bar).toContain('background: transparent;');
    const site = await readFile(join(root, 'app/layouts/site.scss'), 'utf8');
    expect(site).toMatch(
      /> header\.site-chrome \{[\s\S]*?background: transparent;[\s\S]*?box-shadow: none;[\s\S]*?backdrop-filter: blur\(14px\);/
    );
    expect(site).toContain('@media (prefers-reduced-transparency: reduce)');
    expect(site).toContain('@supports not ((backdrop-filter: blur(1px))');
  });
});
