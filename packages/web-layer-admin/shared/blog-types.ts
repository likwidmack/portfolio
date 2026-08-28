/**
 * Shared blog post types + slug helper (safe for app + server + admin layer).
 * Single source for `@tgmc/web` `#shared/blog-types` and admin Vue pages.
 */
export type BlogPostStatus = 'draft' | 'published';

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  status: BlogPostStatus;
  /** ISO-8601 timestamp */
  createdAt: string;
  /** ISO-8601 timestamp */
  updatedAt: string;
  /** ISO-8601 timestamp when published; null for drafts / unpublished */
  publishedAt: string | null;
}

export interface CreateBlogPostInput {
  slug: string;
  title: string;
  excerpt?: string;
  body: string;
  status?: BlogPostStatus;
}

export interface UpdateBlogPostInput {
  slug?: string;
  title?: string;
  excerpt?: string;
  body?: string;
  status?: BlogPostStatus;
}

/**
 * Normalize a slug to lowercase kebab-case (letters, numbers, hyphens).
 */
export function normalizeSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
