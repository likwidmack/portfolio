export const JOURNEY_SKIP_COOKIE = 'tgmc-journey-skip';
export const JOURNEY_PATH_COOKIE = 'tgmc-journey-path';
export const JOURNEY_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Cookie flags for the `storage` singleton cookie driver (`WebStorageService`). */
export const JOURNEY_STORAGE_COOKIE = {
  path: '/',
  maxAge: JOURNEY_COOKIE_MAX_AGE,
  sameSite: 'Lax' as const,
};

export type JourneyStorageWriter = {
  set: (
    key: string,
    value: unknown,
    options?: {
      driver?: 'local' | 'session' | 'cookie';
      cookie?: { path?: string; maxAge?: number; sameSite?: 'Strict' | 'Lax' | 'None' };
    }
  ) => Promise<void>;
};

export const SPLASH_PATH = '/splash';
export const HOME_PATH = '/';
export const DISCOVERY_FIRST_BEAT = '/work/media-systems';
export const PROCESS_FIRST_BEAT = '/process#agentic-ui-exploration';
export const EXHIBITION_FIRST_BEAT = '/gallery?specimen=tesseract-framework-reel';
export const ON_VIEW_PATH = DISCOVERY_FIRST_BEAT;
export const ON_VIEW_ACCESSIBLE_NAME = 'On view: Media Systems';

/** Public decision-card ids that skip-home may remember. Keep in sync with `content/decision-cards/`. */
export const PROCESS_CARD_IDS = [
  'agentic-ui-exploration',
  'manhattan-2150-refinement',
  'github-outcomes',
  'codex-assisted-development',
] as const;

/** Gallery post ids that skip-home may remember. Keep in sync with `content/gallery.json`. */
export const GALLERY_SPECIMEN_IDS = [
  'tesseract-framework-reel',
  'crystal-binary-helix-reel',
  'algorithmic-helix-still',
  'cosmic-network-still',
  'manhattan-keyframe',
  'content-refactor-tools',
  'deploy-ops-helpers',
  'syntax-pipeline',
  'agentic-ui-helpers',
  'webxr-loft',
  'manhattan-storyboard',
  'data-story-boards',
  'prototype-acceleration',
] as const;

export type SplashDoorId = 'discovery' | 'process' | 'exhibition';

/** Canonical splash door per case-study slug (R15). Assignment-only until interiors retitle. */
export const CANONICAL_DOOR_BY_SLUG = {
  'media-systems': 'discovery',
  'data-visualization': 'discovery',
  'experience-systems': 'discovery',
  'human-controlled-ai-lab': 'process',
  'innovation-prototyping': 'exhibition',
  'spatial-experiences': 'exhibition',
} as const satisfies Record<string, SplashDoorId>;

export type HomeLanding = { kind: 'splash' } | { kind: 'previous'; path: string };

function parseJourneyUrl(raw: string): URL | null {
  try {
    return new URL(raw, 'https://portfolio.local');
  } catch {
    return null;
  }
}

function normalizedPathname(url: URL): string {
  const pathname = url.pathname.replace(/\/+$/, '');
  return pathname === '' ? '/' : pathname;
}

/** Decode cookie values from `useCookie` / `WebStorageService`. Non-strings are invalid. */
export function unwrapStoredString(value: unknown): string | null {
  if (value == null || value === '') return null;
  if (typeof value !== 'string') return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed === 'string') return parsed;
    if (typeof parsed === 'number' || typeof parsed === 'boolean') return String(parsed);
    return null;
  } catch {
    return value;
  }
}

export function parseSkipFlag(value: unknown): boolean {
  const flag = unwrapStoredString(value);
  return flag === '1' || flag === 'true';
}

function isRelativeSameOriginPath(raw: string): boolean {
  return raw.startsWith('/') && !raw.startsWith('//');
}

function isAllowlistedId(ids: readonly string[], value: string): boolean {
  return ids.includes(value);
}

/** Rebuild from known slug / specimen / card hash only; drop unknown query and fragments. */
function rememberedJourneyPath(url: URL): string | null {
  const pathname = normalizedPathname(url);

  const workMatch = /^\/work\/([^/]+)$/.exec(pathname);
  if (workMatch?.[1] && Object.hasOwn(CANONICAL_DOOR_BY_SLUG, workMatch[1])) {
    return `/work/${workMatch[1]}`;
  }

  if (pathname === '/gallery') {
    const specimen = url.searchParams.get('specimen');
    if (specimen != null && isAllowlistedId(GALLERY_SPECIMEN_IDS, specimen)) {
      return `/gallery?specimen=${specimen}`;
    }
    return null;
  }

  if (pathname === '/process') {
    const cardId = url.hash.replace(/^#/, '');
    if (cardId && isAllowlistedId(PROCESS_CARD_IDS, cardId)) {
      return `/process#${cardId}`;
    }
  }

  return null;
}

export function isEligibleInteriorPath(raw: string): boolean {
  if (!isRelativeSameOriginPath(raw)) return false;
  const url = parseJourneyUrl(raw);
  return url != null && rememberedJourneyPath(url) != null;
}

export function previousViewIfValid(raw: unknown): string | null {
  const path = unwrapStoredString(raw);
  if (!path) return null;
  if (!isRelativeSameOriginPath(path)) return null;
  const url = parseJourneyUrl(path);
  return url ? rememberedJourneyPath(url) : null;
}

export function shouldRememberPath(raw: string): boolean {
  return isEligibleInteriorPath(raw);
}

export function isSplashPath(raw: string): boolean {
  const url = parseJourneyUrl(raw);
  if (!url) return raw === HOME_PATH || raw === SPLASH_PATH;
  const pathname = normalizedPathname(url);
  return pathname === HOME_PATH || pathname === SPLASH_PATH;
}

export function effectiveHomeLanding(input: { skip: boolean; previous: unknown }): HomeLanding {
  if (!input.skip) return { kind: 'splash' };
  const previous = previousViewIfValid(input.previous ?? null);
  if (!previous) return { kind: 'splash' };
  return { kind: 'previous', path: previous };
}

export async function writeJourneySkip(store: JourneyStorageWriter, skip: boolean): Promise<void> {
  await store.set(JOURNEY_SKIP_COOKIE, skip ? '1' : '0', {
    driver: 'cookie',
    cookie: JOURNEY_STORAGE_COOKIE,
  });
}

export async function writeJourneyPreviousView(store: JourneyStorageWriter, fullPath: string): Promise<void> {
  const canonical = previousViewIfValid(fullPath);
  if (!canonical) return;
  await store.set(JOURNEY_PATH_COOKIE, canonical, {
    driver: 'cookie',
    cookie: JOURNEY_STORAGE_COOKIE,
  });
}

export function firstBeatHref(door: SplashDoorId): string {
  switch (door) {
    case 'discovery':
      return DISCOVERY_FIRST_BEAT;
    case 'process':
      return PROCESS_FIRST_BEAT;
    case 'exhibition':
      return EXHIBITION_FIRST_BEAT;
    default: {
      const exhaustive: never = door;
      return exhaustive;
    }
  }
}

function titleCaseSegment(part: string): string {
  const lower = part.toLowerCase();
  if (lower === 'ui') return 'UI';
  if (lower === 'ai') return 'AI';
  return part.charAt(0).toUpperCase() + part.slice(1);
}

function humanizeSegment(value: string): string {
  const parts = value.split(/[-_]/).filter(Boolean);
  if (!parts.length) return 'Previous view';
  return parts.map(titleCaseSegment).join(' ');
}

export function previousViewTitle(raw: string): string {
  const url = parseJourneyUrl(raw);
  if (!url) return 'Previous view';
  const pathname = normalizedPathname(url);
  const workMatch = /^\/work\/([^/]+)$/.exec(pathname);
  if (workMatch?.[1]) return humanizeSegment(workMatch[1]);
  if (pathname === '/gallery') {
    const specimen = url.searchParams.get('specimen');
    if (specimen) return humanizeSegment(specimen);
  }
  if (pathname === '/process' && url.hash.length > 1) {
    return humanizeSegment(url.hash.slice(1));
  }
  return 'Previous view';
}
