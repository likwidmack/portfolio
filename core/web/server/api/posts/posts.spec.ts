// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { normalizeSlug, parseCreateBlogPostBody, parseUpdateBlogPostBody } from './parse-body';

describe('normalizeSlug', () => {
  it('kebab-cases and strips invalid characters', () => {
    expect(normalizeSlug(' Hello World! ')).toBe('hello-world');
    expect(normalizeSlug('Already-ok')).toBe('already-ok');
  });
});

describe('parseCreateBlogPostBody', () => {
  it('accepts valid create bodies', () => {
    expect(
      parseCreateBlogPostBody({
        title: ' Hello ',
        slug: 'Hello World',
        body: ' # Hi ',
        excerpt: ' Ex ',
        status: 'published',
      })
    ).toEqual({
      ok: true,
      value: {
        title: 'Hello',
        slug: 'hello-world',
        body: '# Hi',
        excerpt: 'Ex',
        status: 'published',
      },
    });
  });

  it('rejects invalid create bodies', () => {
    expect(parseCreateBlogPostBody(null).ok).toBe(false);
    expect(parseCreateBlogPostBody({ title: 'x', slug: '!!!', body: 'y' }).ok).toBe(false);
    expect(parseCreateBlogPostBody({ title: '', slug: 'ok', body: 'y' }).ok).toBe(false);
  });
});

describe('parseUpdateBlogPostBody', () => {
  it('accepts partial updates', () => {
    expect(parseUpdateBlogPostBody({ status: 'published' })).toEqual({
      ok: true,
      value: { status: 'published' },
    });
  });

  it('rejects empty updates and bad status', () => {
    expect(parseUpdateBlogPostBody({}).ok).toBe(false);
    expect(parseUpdateBlogPostBody({ status: 'live' }).ok).toBe(false);
  });
});
