import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  CANONICAL_DOOR_BY_SLUG,
  DISCOVERY_FIRST_BEAT,
  effectiveHomeLanding,
  EXHIBITION_FIRST_BEAT,
  firstBeatHref,
  GALLERY_SPECIMEN_IDS,
  isEligibleInteriorPath,
  isSplashPath,
  JOURNEY_PATH_COOKIE,
  JOURNEY_SKIP_COOKIE,
  JOURNEY_STORAGE_COOKIE,
  ON_VIEW_ACCESSIBLE_NAME,
  ON_VIEW_PATH,
  parseSkipFlag,
  previousViewIfValid,
  previousViewTitle,
  PROCESS_CARD_IDS,
  PROCESS_FIRST_BEAT,
  shouldRememberPath,
  SPLASH_PATH,
  unwrapStoredString,
  writeJourneyPreviousView,
  writeJourneySkip,
} from '../shared/journey-preference';

const contentRoot = join(import.meta.dirname, '../content');

function loadGallerySpecimenIds(): string[] {
  const gallery = JSON.parse(readFileSync(join(contentRoot, 'gallery.json'), 'utf8')) as {
    categories: { items: { id: string }[] }[];
  };
  return gallery.categories.flatMap((category) => category.items.map((item) => item.id));
}

function loadDecisionCardIds(): string[] {
  const dir = join(contentRoot, 'decision-cards');
  return readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .map((name) => {
      const doc = JSON.parse(readFileSync(join(dir, name), 'utf8')) as { id?: string };
      return doc.id ?? name.replace(/\.json$/, '');
    });
}

function loadCaseStudySlugs(): string[] {
  const dir = join(contentRoot, 'case-studies');
  return readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .map((name) => name.replace(/\.json$/, ''));
}

describe('journey preference allowlist', () => {
  const workSlug = Object.keys(CANONICAL_DOOR_BY_SLUG)[0]!;
  const workPath = `/work/${workSlug}`;
  const specimen = GALLERY_SPECIMEN_IDS[0]!;
  const specimenPath = `/gallery?specimen=${specimen}`;
  const cardId = PROCESS_CARD_IDS[0]!;
  const processPath = `/process#${cardId}`;

  it('treats empty cookies as splash with no previous view', () => {
    expect(parseSkipFlag(null)).toBe(false);
    expect(previousViewIfValid(null)).toBeNull();
    expect(effectiveHomeLanding({ skip: false, previous: null })).toEqual({ kind: 'splash' });
  });

  it('sends skip-on plus an exhibition specimen home landing to that path', () => {
    expect(isEligibleInteriorPath(specimenPath)).toBe(true);
    expect(effectiveHomeLanding({ skip: true, previous: specimenPath })).toEqual({
      kind: 'previous',
      path: specimenPath,
    });
  });

  it('falls back to splash when skip is on but previous is About or Docs', () => {
    expect(previousViewIfValid('/about')).toBeNull();
    expect(previousViewIfValid('/docs/foo')).toBeNull();
    expect(effectiveHomeLanding({ skip: true, previous: '/about' })).toEqual({ kind: 'splash' });
    expect(effectiveHomeLanding({ skip: true, previous: '/docs/foo' })).toEqual({ kind: 'splash' });
  });

  it('rejects indexes and splash routes as interiors', () => {
    expect(isEligibleInteriorPath('/work')).toBe(false);
    expect(isEligibleInteriorPath('/gallery')).toBe(false);
    expect(isEligibleInteriorPath('/process')).toBe(false);
    expect(isEligibleInteriorPath('/')).toBe(false);
    expect(isEligibleInteriorPath('/splash')).toBe(false);
    expect(shouldRememberPath('/')).toBe(false);
    expect(shouldRememberPath('/splash')).toBe(false);
  });

  it('rejects absolute and protocol-relative previous-view cookies', () => {
    expect(isEligibleInteriorPath(`https://external.example${workPath}`)).toBe(false);
    expect(previousViewIfValid(`https://external.example${workPath}`)).toBeNull();
    expect(isEligibleInteriorPath(`//evil.example${workPath}`)).toBe(false);
    expect(effectiveHomeLanding({ skip: true, previous: `https://external.example${workPath}` })).toEqual({
      kind: 'splash',
    });
  });

  it('falls back to splash when skip is on but the work slug is not a current case study', () => {
    expect(isEligibleInteriorPath('/work/removed-study')).toBe(false);
    expect(previousViewIfValid('/work/removed-study')).toBeNull();
    expect(effectiveHomeLanding({ skip: true, previous: '/work/removed-study' })).toEqual({ kind: 'splash' });
  });

  it('falls back to splash when skip is on but the gallery specimen is unknown', () => {
    expect(isEligibleInteriorPath('/gallery?specimen=removed-or-typo')).toBe(false);
    expect(previousViewIfValid('/gallery?specimen=removed-or-typo')).toBeNull();
    expect(effectiveHomeLanding({ skip: true, previous: '/gallery?specimen=removed-or-typo' })).toEqual({
      kind: 'splash',
    });
  });

  it('falls back to splash when skip is on but the process hash is not a public card', () => {
    expect(isEligibleInteriorPath('/process#removed-card')).toBe(false);
    expect(previousViewIfValid('/process#removed-card')).toBeNull();
    expect(effectiveHomeLanding({ skip: true, previous: '/process#removed-card' })).toEqual({ kind: 'splash' });
  });

  it('rebuilds remembered paths from known slug, specimen, or card hash only', () => {
    expect(previousViewIfValid(`${workPath}?token=secret`)).toBe(workPath);
    expect(previousViewIfValid(`${specimenPath}&token=secret`)).toBe(specimenPath);
    expect(previousViewIfValid(`/process?token=secret#${cardId}`)).toBe(processPath);
    expect(effectiveHomeLanding({ skip: true, previous: `${workPath}?token=secret` })).toEqual({
      kind: 'previous',
      path: workPath,
    });
  });

  it('treats non-string decoded cookies as invalid instead of throwing', () => {
    expect(unwrapStoredString({})).toBeNull();
    expect(previousViewIfValid({})).toBeNull();
    expect(effectiveHomeLanding({ skip: true, previous: {} })).toEqual({ kind: 'splash' });
  });

  it('accepts the three door first-beat paths', () => {
    expect(isEligibleInteriorPath(DISCOVERY_FIRST_BEAT)).toBe(true);
    expect(isEligibleInteriorPath(PROCESS_FIRST_BEAT)).toBe(true);
    expect(isEligibleInteriorPath(EXHIBITION_FIRST_BEAT)).toBe(true);
  });

  it('treats unreadable skip values as off (cookies blocked / empty)', () => {
    expect(parseSkipFlag(undefined)).toBe(false);
    expect(parseSkipFlag('')).toBe(false);
    expect(effectiveHomeLanding({ skip: false, previous: workPath })).toEqual({ kind: 'splash' });
  });

  it('labels previous-view by humanizing path segments, not craft copy from content', () => {
    expect(previousViewTitle('/gallery?specimen=alpha-beta_reel')).toBe('Alpha Beta Reel');
    expect(previousViewTitle('/work/my-custom-study')).toBe('My Custom Study');
    expect(previousViewTitle('/process#card-one-two')).toBe('Card One Two');
    expect(previousViewTitle('/gallery?specimen=alpha-beta_reel')).not.toContain('/gallery');
  });

  it('maps first-beat hrefs from door constants without using indexes', () => {
    expect(firstBeatHref('discovery')).toBe(DISCOVERY_FIRST_BEAT);
    expect(firstBeatHref('process')).toBe(PROCESS_FIRST_BEAT);
    expect(firstBeatHref('exhibition')).toBe(EXHIBITION_FIRST_BEAT);
    expect(Object.values(CANONICAL_DOOR_BY_SLUG)).toEqual(
      expect.arrayContaining(['discovery', 'process', 'exhibition'])
    );
  });

  it('treats `/` and `/splash` as splash paths', () => {
    expect(isSplashPath('/')).toBe(true);
    expect(isSplashPath('/splash')).toBe(true);
    expect(isSplashPath(workPath)).toBe(false);
    expect(isSplashPath('/about')).toBe(false);
  });

  it('points On view at the discovery first beat with a derived accessible name', () => {
    expect(ON_VIEW_PATH).toBe(DISCOVERY_FIRST_BEAT);
    expect(ON_VIEW_ACCESSIBLE_NAME).toBe(`On view: ${previousViewTitle(ON_VIEW_PATH)}`);
    expect(SPLASH_PATH).toBe('/splash');
  });

  it('does not remember About, Docs, Lab, indexes, or splash as previous view', () => {
    for (const path of [
      '/about',
      '/docs/foo',
      '/ai-lab',
      '/blog',
      '/code',
      '/product',
      '/styles',
      '/media-player',
      '/cdn-test',
      '/work',
      '/gallery',
      '/process',
      '/',
      '/splash',
    ]) {
      expect(shouldRememberPath(path), path).toBe(false);
    }
  });

  it('unwraps JSON cookie values written by WebStorageService', () => {
    expect(unwrapStoredString('"1"')).toBe('1');
    expect(parseSkipFlag('"true"')).toBe(true);
    expect(previousViewIfValid(`"${processPath}"`)).toBe(processPath);
    expect(effectiveHomeLanding({ skip: true, previous: `"${workPath}"` })).toEqual({
      kind: 'previous',
      path: workPath,
    });
  });

  it('writes skip and eligible previous-view through a storage cookie driver', async () => {
    const writes: Array<{ key: string; value: unknown; driver?: string }> = [];
    const store = {
      set: async (key: string, value: unknown, options?: { driver?: 'cookie' | 'local' | 'session' }) => {
        writes.push({ key, value, driver: options?.driver });
      },
    };

    await writeJourneySkip(store, true);
    await writeJourneyPreviousView(store, '/about');
    await writeJourneyPreviousView(store, '/');
    await writeJourneyPreviousView(store, '/splash');
    await writeJourneyPreviousView(store, processPath);
    await writeJourneyPreviousView(store, `${specimenPath}&token=secret`);

    expect(writes).toEqual([
      { key: JOURNEY_SKIP_COOKIE, value: '1', driver: 'cookie' },
      { key: JOURNEY_PATH_COOKIE, value: processPath, driver: 'cookie' },
      { key: JOURNEY_PATH_COOKIE, value: specimenPath, driver: 'cookie' },
    ]);
    expect(JOURNEY_STORAGE_COOKIE.path).toBe('/');
    expect(JOURNEY_STORAGE_COOKIE.sameSite).toBe('Lax');
  });

  it('keeps journey allowlists and first beats synchronized with content JSON', () => {
    const galleryIds = new Set(loadGallerySpecimenIds());
    const cardIds = new Set(loadDecisionCardIds());
    const caseSlugs = new Set(loadCaseStudySlugs());

    for (const id of GALLERY_SPECIMEN_IDS) {
      expect(galleryIds.has(id), `gallery specimen ${id}`).toBe(true);
    }
    for (const id of PROCESS_CARD_IDS) {
      expect(cardIds.has(id), `decision card ${id}`).toBe(true);
    }
    for (const slug of Object.keys(CANONICAL_DOOR_BY_SLUG)) {
      expect(caseSlugs.has(slug), `case study ${slug}`).toBe(true);
    }

    expect(DISCOVERY_FIRST_BEAT.startsWith('/work/')).toBe(true);
    expect(caseSlugs.has(DISCOVERY_FIRST_BEAT.slice('/work/'.length))).toBe(true);
    expect(PROCESS_FIRST_BEAT.startsWith('/process#')).toBe(true);
    expect(cardIds.has(PROCESS_FIRST_BEAT.slice('/process#'.length))).toBe(true);
    expect(EXHIBITION_FIRST_BEAT.startsWith('/gallery?specimen=')).toBe(true);
    expect(galleryIds.has(EXHIBITION_FIRST_BEAT.slice('/gallery?specimen='.length))).toBe(true);
  });
});
