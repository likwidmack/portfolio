/**
 * Shared helpers for blog post create/update timestamp and publish fields.
 */
import type { BlogPost, BlogPostStatus, CreateBlogPostInput, UpdateBlogPostInput } from './blog-types';
import { BlogPostSlugConflictError } from './blog-types';

export const POSTS_MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'published')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  published_at TEXT
);
CREATE INDEX IF NOT EXISTS posts_status_published_at_idx ON posts (status, published_at);
CREATE INDEX IF NOT EXISTS posts_slug_idx ON posts (slug);
`;

export type BlogPostMutableFields = Pick<BlogPost, 'slug' | 'title' | 'excerpt' | 'body' | 'status' | 'publishedAt'>;

export function resolveCreateFields(input: CreateBlogPostInput): Omit<BlogPost, 'id'> {
  const now = new Date().toISOString();
  const status: BlogPostStatus = input.status ?? 'draft';
  return {
    slug: input.slug,
    title: input.title,
    excerpt: input.excerpt ?? '',
    body: input.body,
    status,
    createdAt: now,
    updatedAt: now,
    publishedAt: status === 'published' ? now : null,
  };
}

export function resolveUpdateFields(
  existing: BlogPostMutableFields,
  input: UpdateBlogPostInput
): BlogPostMutableFields & { updatedAt: string } {
  const now = new Date().toISOString();
  const status: BlogPostStatus = input.status ?? existing.status;

  let publishedAt = existing.publishedAt;
  if (status === 'published' && existing.status !== 'published') {
    publishedAt = now;
  } else if (status === 'draft') {
    publishedAt = null;
  }

  return {
    slug: input.slug ?? existing.slug,
    title: input.title ?? existing.title,
    excerpt: input.excerpt ?? existing.excerpt,
    body: input.body ?? existing.body,
    status,
    updatedAt: now,
    publishedAt,
  };
}

/**
 * Map SQL unique-constraint failures to BlogPostSlugConflictError; otherwise rethrow.
 */
export function rethrowIfSlugConflict(error: unknown, slug: string): never {
  const message = error instanceof Error ? error.message : String(error);
  if (/unique/i.test(message)) {
    throw new BlogPostSlugConflictError(slug);
  }
  throw error;
}
