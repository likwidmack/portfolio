import { describe, expect, it } from 'vitest';

import {
  docHref,
  docTitle,
  filterDocsEntries,
  groupDocsEntries,
  groupFromDocPath,
  isDocsArticleSlug,
} from '../shared/docs-catalog';

describe('docs catalog helpers', () => {
  it('maps repo-relative content paths into browse groups', () => {
    expect(groupFromDocPath('/web/guides/quickstart')).toBe('web');
    expect(groupFromDocPath('/agents/map')).toBe('agents');
    expect(groupFromDocPath('/cicd')).toBe('ops');
    expect(groupFromDocPath('/README')).toBe('overview');
  });

  it('builds in-app hrefs and titles', () => {
    expect(docHref('/cicd')).toBe('/docs/cicd');
    expect(docTitle({ path: '/web/setup/ssl-setup', stem: 'web/setup/ssl-setup' })).toBe('Ssl Setup');
    expect(docTitle({ path: '/cicd', title: 'CI/CD' })).toBe('CI/CD');
  });

  it('does not treat an empty catch-all slug as an article', () => {
    expect(isDocsArticleSlug(undefined)).toBe(false);
    expect(isDocsArticleSlug([])).toBe(false);
    expect(isDocsArticleSlug([''])).toBe(false);
    expect(isDocsArticleSlug(['web', 'guides', 'quickstart'])).toBe(true);
  });

  it('filters and groups index entries', () => {
    const entries = [
      { path: '/cicd', title: 'CI/CD', description: 'Four-env topology' },
      { path: '/web/guides/quickstart', title: 'Quick start' },
      { path: '/agents/map', title: 'Repo map' },
    ];
    expect(filterDocsEntries(entries, 'ops', '').map((entry) => entry.path)).toEqual(['/cicd']);
    expect(filterDocsEntries(entries, 'all', 'quick').map((entry) => entry.path)).toEqual(['/web/guides/quickstart']);
    expect(groupDocsEntries(entries).map((bucket) => bucket.group)).toEqual(['web', 'agents', 'ops']);
  });
});
