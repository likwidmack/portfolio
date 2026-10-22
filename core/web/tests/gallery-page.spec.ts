import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { PRIMARY_NAV_ITEMS } from '../shared/primary-nav';

type GalleryContent = {
  categories: {
    id: string;
    items: { id: string; platform: string; exhibit?: { src?: string } }[];
  }[];
  cta: { primaryLabel: string };
};

const navPath = join(import.meta.dirname, '../app/components/AppPrimaryNav/index.vue');
const galleryPagePath = join(import.meta.dirname, '../app/pages/gallery/index.vue');
const galleryStylePath = join(import.meta.dirname, '../app/pages/gallery/index.scss');
const galleryDataPath = join(import.meta.dirname, '../content/gallery.json');

async function loadGalleryContent(): Promise<GalleryContent> {
  return JSON.parse(await readFile(galleryDataPath, 'utf8')) as GalleryContent;
}

describe('gallery hub', () => {
  it('exposes gallery in primary navigation without a /work redirect', async () => {
    const nuxtConfig = await readFile(join(import.meta.dirname, '../nuxt.config.ts'), 'utf8');
    const nav = await readFile(navPath, 'utf8');
    expect(nuxtConfig).not.toContain("'/gallery': { redirect:");
    expect(nav).toContain('PRIMARY_NAV_ITEMS');
    expect(PRIMARY_NAV_ITEMS.map((item) => item.to)).toContain('/gallery');
    expect(nav).not.toContain('to="/docs"');
    expect(nav).not.toContain('to="/ai-lab"');
    expect(nav).not.toContain('to="/process"');
  });

  it('loads a filterable feed from the gallery collection', async () => {
    const page = await readFile(galleryPagePath, 'utf8');
    const style = await readFile(galleryStylePath, 'utf8');
    const gallery = await loadGalleryContent();
    expect(page).toContain("fetchContentCollection<GalleryContent>('gallery'");
    expect(page).toContain('AppBrowseToolbar');
    expect(page).toContain('GalleryFeedCard');
    expect(page).toContain('gallery-grid__stats');
    expect(page).toContain('article.gallery-grid__tile');
    expect(page).toContain('button.gallery-grid__open');
    expect(page).not.toContain('button.gallery-grid__tile');
    expect(style).toContain('--portfolio-teal-color');
    expect(page).toContain('useBrowseQuery(');
    expect(page).toContain('computed<GalleryViewMode>');
    expect(page).not.toContain('queryCollection(');
    expect(gallery.categories.some((category) => category.id === 'reels')).toBe(true);
    expect(
      gallery.categories.every((category) =>
        category.items.every((item) => item.id.length > 0 && item.platform.length > 0)
      )
    ).toBe(true);
    expect(
      gallery.categories.some((category) =>
        category.items.some((item) => typeof item.exhibit?.src === 'string' && item.exhibit.src.length > 0)
      )
    ).toBe(true);
  });

  it('opens the feed as a modal dialog (inert background, Esc, focus in and back)', async () => {
    const page = await readFile(galleryPagePath, 'utf8');
    const style = await readFile(galleryStylePath, 'utf8');
    expect(page).toMatch(
      /section\.gallery-feed\([^)]*role="dialog"[^)]*aria-modal="true"[^)]*aria-label="Gallery feed"/
    );
    expect(page).toContain('inertOutside(dialog)');
    expect(page).toContain("event.key !== 'Escape' || event.defaultPrevented || event.isComposing");
    // The scroll position is not live; one polite announcement on open.
    expect(page).not.toMatch(/gallery-feed__status\(aria-live/);
    expect(page).toContain('span.sr-only(aria-live="polite") {{ feedAnnouncement }}');
    expect(page).toContain('@click="closeFeed"');
    // Focus returns to the opening tile by id: the grid re-renders it, and `activePostId` follows
    // the scroll, so it may name a neighbouring post by the time the feed closes.
    expect(page).toContain('feedOpenerId = id;');
    expect(page).toMatch(
      /opener\?\.isConnected \? opener : null\) \?\?\s*\(openerId \? document\.getElementById\(openerId\) : null\)/
    );
    // The close meets the touch floor and draws the standard ring.
    expect(style).toMatch(/&__back \{\s*@include touch-target;/);
  });

  it('imports and uses gallery aspect/platform helpers in script setup', async () => {
    const page = await readFile(galleryPagePath, 'utf8');
    // Imports alone are not enough: Pug + script-setup can elide template-only imports.
    for (const name of [
      'GALLERY_PLATFORM_LABEL',
      'galleryEngagementLabel',
      'resolveGalleryAspect',
      'resolveGalleryPlatform',
    ] as const) {
      expect(page).toContain(name);
    }
    expect(page).toContain("from '#shared/gallery-types'");
    expect(page).toContain('gridTiles');
    expect(page).toContain(':id="tile.post.id"');
    expect(page).toContain('route.query.specimen');
    expect(page).toContain('gallery-grid__tile--on-view');
    expect(page).toContain('usePrefersReducedMotion');
    expect(page).toContain("reducedMotion.value ? 'instant' : 'smooth'");
    expect(page).not.toContain("behavior: 'smooth'");
    expect(page).not.toContain('openInFeed(specimen');
    expect(page).toContain('resolveGalleryAspect(post)');
    expect(page).toContain('resolveGalleryPlatform(post)');
    expect(page).toContain('galleryEngagementLabel(post)');
    expect(page).toContain('GALLERY_PLATFORM_LABEL[platform]');
    // Template must not call helpers directly on _ctx (regression of the instance warning).
    expect(page).not.toMatch(/:data-aspect="resolveGalleryAspect\(/);
    expect(page).not.toMatch(/GALLERY_PLATFORM_LABEL\[resolveGalleryPlatform\(/);
    expect(page).not.toMatch(/galleryEngagementLabel\(post\)\}\}/);
  });

  it('keeps the gallery hire CTA this increment', async () => {
    const page = await readFile(galleryPagePath, 'utf8');
    const gallery = await loadGalleryContent();

    expect(page).toContain('content.cta.primaryLabel');
    expect(page).toContain('contactMailto');
    expect(gallery.cta.primaryLabel.length).toBeGreaterThan(0);
  });
});
