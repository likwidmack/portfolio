// @vitest-environment node

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const blogIndexPath = join(import.meta.dirname, '../app/pages/blog/index.vue');
const blogSlugPath = join(import.meta.dirname, '../app/pages/blog/[slug].vue');
const navPath = join(import.meta.dirname, '../app/components/AppPrimaryNav.vue');

describe('blog pages', () => {
  it('lists posts from the public API', () => {
    const page = readFileSync(blogIndexPath, 'utf8');
    expect(page).toContain('/api/posts');
    expect(page).toContain('Blog');
  });

  it('loads a published post by slug', () => {
    const page = readFileSync(blogSlugPath, 'utf8');
    expect(page).toContain('/api/posts/');
    expect(page).toContain('v-html');
  });

  it('adds Blog to primary nav', () => {
    const nav = readFileSync(navPath, 'utf8');
    expect(nav).toContain('to="/blog"');
  });
});
