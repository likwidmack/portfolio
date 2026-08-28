/**
 * Host-injected blog API for admin Nitro handlers (no ~~/server imports).
 */
import type { BlogPost } from '../../shared/blog-types';

export type AdminCreatePostResult =
  { ok: true; value: BlogPost } | { ok: false; message: string; code?: 'SLUG_CONFLICT' };

export type AdminUpdatePostResult =
  { ok: true; value: BlogPost } | { ok: false; message: string; code?: 'NOT_FOUND' | 'SLUG_CONFLICT' };

export type AdminDeletePostResult = { ok: true } | { ok: false; code: 'NOT_FOUND'; message: string };

/**
 * Facade the host Nitro plugin attaches to `event.context.adminBlog`.
 */
export interface AdminBlogApi {
  listAllPosts(): Promise<BlogPost[]>;
  getPostById(id: string): Promise<BlogPost | null>;
  createBlogPostFromBody(body: unknown): Promise<AdminCreatePostResult>;
  updateBlogPostFromBody(id: string, body: unknown): Promise<AdminUpdatePostResult>;
  deleteBlogPostById(id: string): Promise<AdminDeletePostResult>;
}

declare module 'h3' {
  interface H3EventContext {
    adminBlog?: AdminBlogApi;
  }
}
