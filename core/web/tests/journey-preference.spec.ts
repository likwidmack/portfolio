import { describe, expect, it } from 'vitest';

import {
  CANONICAL_DOOR_BY_SLUG,
  JOURNEY_PATH_COOKIE,
  JOURNEY_SKIP_COOKIE,
  JOURNEY_STORAGE_COOKIE,
  ON_VIEW_ACCESSIBLE_NAME,
  ON_VIEW_PATH,
  SPLASH_PATH,
  effectiveHomeLanding,
  firstBeatHref,
  isEligibleInteriorPath,
  isSplashPath,
  parseSkipFlag,
  previousViewIfValid,
  previousViewTitle,
  shouldRememberPath,
  unwrapStoredString,
  writeJourneyPreviousView,
  writeJourneySkip,
} from '../shared/journey-preference';

describe('journey preference allowlist', () => {
  it('treats empty cookies as splash with no previous view', () => {
    expect(parseSkipFlag(null)).toBe(false);
    expect(previousViewIfValid(null)).toBeNull();
    expect(effectiveHomeLanding({ skip: false, previous: null })).toEqual({ kind: 'splash' });
  });

  it('sends skip-on plus an exhibition specimen home landing to that path', () => {
    const previous = '/gallery?specimen=tesseract-framework-reel';
    expect(isEligibleInteriorPath(previous)).toBe(true);
    expect(effectiveHomeLanding({ skip: true, previous })).toEqual({ kind: 'previous', path: previous });
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
    expect(isEligibleInteriorPath('https://external.example/work/media-systems')).toBe(false);
    expect(previousViewIfValid('https://external.example/work/media-systems')).toBeNull();
    expect(isEligibleInteriorPath('//evil.example/work/media-systems')).toBe(false);
    expect(effectiveHomeLanding({ skip: true, previous: 'https://external.example/work/media-systems' })).toEqual({
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
    expect(previousViewIfValid('/work/media-systems?token=secret')).toBe('/work/media-systems');
    expect(previousViewIfValid('/gallery?specimen=tesseract-framework-reel&token=secret')).toBe(
      '/gallery?specimen=tesseract-framework-reel'
    );
    expect(previousViewIfValid('/process?token=secret#agentic-ui-exploration')).toBe('/process#agentic-ui-exploration');
    expect(effectiveHomeLanding({ skip: true, previous: '/work/media-systems?token=secret' })).toEqual({
      kind: 'previous',
      path: '/work/media-systems',
    });
  });

  it('treats non-string decoded cookies as invalid instead of throwing', () => {
    expect(unwrapStoredString({})).toBeNull();
    expect(previousViewIfValid({})).toBeNull();
    expect(effectiveHomeLanding({ skip: true, previous: {} })).toEqual({ kind: 'splash' });
  });

  it('accepts the three door first-beat paths', () => {
    expect(isEligibleInteriorPath('/work/media-systems')).toBe(true);
    expect(isEligibleInteriorPath('/process#agentic-ui-exploration')).toBe(true);
    expect(isEligibleInteriorPath('/gallery?specimen=tesseract-framework-reel')).toBe(true);
  });

  it('treats unreadable skip values as off (cookies blocked / empty)', () => {
    expect(parseSkipFlag(undefined)).toBe(false);
    expect(parseSkipFlag('')).toBe(false);
    expect(effectiveHomeLanding({ skip: false, previous: '/work/media-systems' })).toEqual({ kind: 'splash' });
  });

  it('labels previous-view with craft titles, not raw paths', () => {
    expect(previousViewTitle('/gallery?specimen=tesseract-framework-reel')).toBe('Tesseract Framework Reel');
    expect(previousViewTitle('/work/media-systems')).toBe('Media Systems');
    expect(previousViewTitle('/process#agentic-ui-exploration')).toBe('Agentic UI Exploration');
    expect(previousViewTitle('/gallery?specimen=tesseract-framework-reel')).not.toContain('/gallery');
  });

  it('maps first-beat hrefs and canonical doors without using indexes', () => {
    expect(firstBeatHref('discovery')).toBe('/work/media-systems');
    expect(firstBeatHref('process')).toBe('/process#agentic-ui-exploration');
    expect(firstBeatHref('exhibition')).toBe('/gallery?specimen=tesseract-framework-reel');
    expect(CANONICAL_DOOR_BY_SLUG['media-systems']).toBe('discovery');
    expect(CANONICAL_DOOR_BY_SLUG['human-controlled-ai-lab']).toBe('process');
    expect(CANONICAL_DOOR_BY_SLUG['spatial-experiences']).toBe('exhibition');
  });

  it('treats `/` and `/splash` as splash paths', () => {
    expect(isSplashPath('/')).toBe(true);
    expect(isSplashPath('/splash')).toBe(true);
    expect(isSplashPath('/work/media-systems')).toBe(false);
    expect(isSplashPath('/about')).toBe(false);
  });

  it('points On view at Media Systems with a craft accessible name', () => {
    expect(ON_VIEW_PATH).toBe('/work/media-systems');
    expect(ON_VIEW_ACCESSIBLE_NAME).toBe('On view: Media Systems');
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
    expect(previousViewIfValid('"/process#agentic-ui-exploration"')).toBe('/process#agentic-ui-exploration');
    expect(effectiveHomeLanding({ skip: true, previous: '"/work/media-systems"' })).toEqual({
      kind: 'previous',
      path: '/work/media-systems',
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
    await writeJourneyPreviousView(store, '/process#agentic-ui-exploration');
    await writeJourneyPreviousView(store, '/gallery?specimen=tesseract-framework-reel&token=secret');

    expect(writes).toEqual([
      { key: JOURNEY_SKIP_COOKIE, value: '1', driver: 'cookie' },
      { key: JOURNEY_PATH_COOKIE, value: '/process#agentic-ui-exploration', driver: 'cookie' },
      { key: JOURNEY_PATH_COOKIE, value: '/gallery?specimen=tesseract-framework-reel', driver: 'cookie' },
    ]);
    expect(JOURNEY_STORAGE_COOKIE.path).toBe('/');
    expect(JOURNEY_STORAGE_COOKIE.sameSite).toBe('Lax');
  });
});
