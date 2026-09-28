import { describe, expect, it } from 'vitest';

import { BROWSE_QUERY_KEYS, isFiltered, readBrowseQuery, writeBrowseQuery } from '../shared/browse-query';

const defaults = { view: 'grid', group: 'all', kind: 'all', query: '' };

describe('browse query', () => {
  it('reads known keys and falls back to defaults', () => {
    expect(readBrowseQuery({ group: 'reels', q: 'ar', junk: 'x' }, defaults)).toEqual({
      view: 'grid',
      group: 'reels',
      kind: 'all',
      query: 'ar',
    });
  });

  it('takes the first value of repeated keys and ignores empty strings', () => {
    expect(readBrowseQuery({ kind: ['video', 'image'], view: '' }, defaults)).toEqual({ ...defaults, kind: 'video' });
  });

  it('writes only non-default values, trimming the search text', () => {
    expect(writeBrowseQuery({ ...defaults, kind: 'video', query: '  hls ' }, defaults)).toEqual({
      kind: 'video',
      q: 'hls',
    });
    expect(writeBrowseQuery(defaults, defaults)).toEqual({});
  });

  it('treats a view change as not filtered', () => {
    expect(isFiltered({ ...defaults, view: 'list' }, defaults)).toBe(false);
    expect(isFiltered({ ...defaults, query: ' x ' }, defaults)).toBe(true);
    expect(isFiltered({ ...defaults, group: 'reels' }, defaults)).toBe(true);
  });

  it('round-trips an optional selected item only when the page opts in', () => {
    const withItem = { ...defaults, item: '' };
    expect(readBrowseQuery({ item: 'mse-queue' }, withItem).item).toBe('mse-queue');
    expect(readBrowseQuery({ item: 'mse-queue' }, defaults)).not.toHaveProperty('item');
    expect(writeBrowseQuery({ ...withItem, item: 'mse-queue' }, withItem)).toEqual({ item: 'mse-queue' });
    expect(isFiltered({ ...withItem, item: 'mse-queue' }, withItem)).toBe(false);
  });

  it('names the query keys it owns so other params (e.g. specimen) survive', () => {
    expect([...BROWSE_QUERY_KEYS]).toEqual(['view', 'group', 'kind', 'q', 'item']);
  });
});
