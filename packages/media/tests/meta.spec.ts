import { describe, expect, it } from 'vitest';

import {
  ASSET_META_KEYS,
  addTags,
  assetHasTag,
  normalizeTag,
  normalizeTags,
  readTags,
  removeTags,
  withTags,
} from '../src/meta.js';

describe('media meta tags', () => {
  it('normalizes tags to lowercase kebab slugs', () => {
    expect(normalizeTag('  Hero Shot ')).toBe('hero-shot');
    expect(normalizeTag('Lottie')).toBe('lottie');
    expect(normalizeTag('')).toBe(null);
    expect(normalizeTags(['Hero', 'hero', '  ', 'Design Source'])).toEqual(['hero', 'design-source']);
  });

  it('reads and writes meta.tags', () => {
    expect(readTags({})).toEqual([]);
    expect(readTags({ [ASSET_META_KEYS.tags]: ['Hero', 'logo'] })).toEqual(['hero', 'logo']);
    expect(withTags({ filename: 'a.png' }, ['Hero'])).toEqual({
      filename: 'a.png',
      tags: ['hero'],
    });
    expect(withTags({ tags: ['hero'] }, [])).toEqual({});
    expect(assetHasTag({ tags: ['hero'] }, 'Hero')).toBe(true);
    expect(assetHasTag({ tags: ['hero'] }, 'logo')).toBe(false);
  });

  it('adds and removes tags', () => {
    const base = { tags: ['hero'] };
    expect(addTags(base, ['Logo', 'hero'])).toEqual({ tags: ['hero', 'logo'] });
    expect(removeTags({ tags: ['hero', 'logo'] }, ['hero'])).toEqual({ tags: ['logo'] });
  });
});
