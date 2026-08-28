// @vitest-environment node

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const blogIndexPath = join(import.meta.dirname, '../app/pages/blog/index.vue');
const blogSlugPath = join(import.meta.dirname, '../app/pages/blog/[slug].vue');
const navPath = join(import.meta.dirname, '../app/components/AppPrimaryNav.vue');
const writingContentPath = join(import.meta.dirname, '../content/writing.json');

describe('blog pages', () => {
  it('renders an editorial writing shelf from content plus published notes', () => {
    const page = readFileSync(blogIndexPath, 'utf8');
    expect(page).toContain("fetchContentCollection<WritingContent>('writing'");
    expect(page).toContain('/api/posts');
    expect(page).toContain('blog-editorial');
    expect(page).toContain('partitionWritingGrid');
  });

  it('loads a published post by slug', () => {
    const page = readFileSync(blogSlugPath, 'utf8');
    expect(page).toContain('/api/posts/');
    expect(page).toContain('v-html');
  });

  it('adds Writing to primary nav at /blog', () => {
    const nav = readFileSync(navPath, 'utf8');
    expect(nav).toContain('to="/blog"');
    expect(nav).toContain('Writing');
    expect(nav).toMatch(/to="\/work"[\s\S]*to="\/about"[\s\S]*to="\/gallery"[\s\S]*to="\/blog"[\s\S]*to="\/code"/);
    expect(nav).not.toContain('to="/docs"');
    expect(nav).not.toContain('AI Lab');
    expect(nav).not.toContain('Process');
  });

  it('ships statused essays in writing content', () => {
    const writing = JSON.parse(readFileSync(writingContentPath, 'utf8')) as {
      essays: Array<{ status: string; title: string }>;
    };
    expect(writing.essays.length).toBeGreaterThanOrEqual(5);
    expect(writing.essays.some((essay) => essay.title.includes('definition of done'))).toBe(true);
  });
});
