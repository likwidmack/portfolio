/**
 * Blog post store types + errors (server DAL).
 */
import type { BlogPost, CreateBlogPostInput, UpdateBlogPostInput } from '../../shared/blog-types';

export type { BlogPost, BlogPostStatus, CreateBlogPostInput, UpdateBlogPostInput } from '../../shared/blog-types';

/**
 * Thin repository interface implemented by each environment adapter.
 */
export interface BlogPostStore {
  listPublished(): Promise<BlogPost[]>;
  listAll(): Promise<BlogPost[]>;
  getBySlug(slug: string): Promise<BlogPost | null>;
  getById(id: string): Promise<BlogPost | null>;
  create(input: CreateBlogPostInput): Promise<BlogPost>;
  update(id: string, input: UpdateBlogPostInput): Promise<BlogPost | null>;
  delete(id: string): Promise<boolean>;
  /** Optional cleanup for pooled / file-backed clients (tests, graceful shutdown). */
  close?(): Promise<void> | void;
}

/** Thrown when a unique slug constraint would be violated. */
export class BlogPostSlugConflictError extends Error {
  readonly code = 'SLUG_CONFLICT' as const;

  constructor(slug: string) {
    super(`A post with slug "${slug}" already exists`);
    this.name = 'BlogPostSlugConflictError';
  }
}
