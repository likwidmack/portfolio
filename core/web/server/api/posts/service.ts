/**
 * Blog post API orchestration — kept free of h3/Nuxt so Vitest can cover it.
 */
import type { BlogPost, BlogPostStore } from '../../db/blog-types';
import { BlogPostSlugConflictError } from '../../db/blog-types';
import {
  parseCreateBlogPostBody,
  parseUpdateBlogPostBody,
  type ParseCreatePostBodyResult,
  type ParseUpdatePostBodyResult,
} from './parse-body';

export type CreateBlogPostResult =
  | { ok: true; value: BlogPost }
  | Extract<ParseCreatePostBodyResult, { ok: false }>
  | { ok: false; code: 'SLUG_CONFLICT'; message: string };

export type UpdateBlogPostResult =
  | { ok: true; value: BlogPost }
  | { ok: false; code: 'NOT_FOUND'; message: string }
  | Extract<ParseUpdatePostBodyResult, { ok: false }>
  | { ok: false; code: 'SLUG_CONFLICT'; message: string };

type SlugConflictResult = { ok: false; code: 'SLUG_CONFLICT'; message: string };

function slugConflictResult(error: unknown): SlugConflictResult | null {
  if (error instanceof BlogPostSlugConflictError) {
    return { ok: false, code: 'SLUG_CONFLICT', message: error.message };
  }
  return null;
}

export const listPublishedPosts = (store: BlogPostStore): Promise<BlogPost[]> => store.listPublished();

export const listAllPosts = (store: BlogPostStore): Promise<BlogPost[]> => store.listAll();

export const getPublishedPostBySlug = async (store: BlogPostStore, slug: string): Promise<BlogPost | null> => {
  const post = await store.getBySlug(slug);
  if (!post || post.status !== 'published') {
    return null;
  }
  return post;
};

export const getPostById = (store: BlogPostStore, id: string): Promise<BlogPost | null> => store.getById(id);

export const createBlogPostFromBody = async (store: BlogPostStore, body: unknown): Promise<CreateBlogPostResult> => {
  const parsed = parseCreateBlogPostBody(body);
  if (!parsed.ok) {
    return parsed;
  }

  try {
    const value = await store.create(parsed.value);
    return { ok: true, value };
  } catch (error) {
    const conflict = slugConflictResult(error);
    if (conflict) {
      return conflict;
    }
    throw error;
  }
};

export const updateBlogPostFromBody = async (
  store: BlogPostStore,
  id: string,
  body: unknown
): Promise<UpdateBlogPostResult> => {
  const parsed = parseUpdateBlogPostBody(body);
  if (!parsed.ok) {
    return parsed;
  }

  try {
    const value = await store.update(id, parsed.value);
    if (!value) {
      return { ok: false, code: 'NOT_FOUND', message: 'Post not found' };
    }
    return { ok: true, value };
  } catch (error) {
    const conflict = slugConflictResult(error);
    if (conflict) {
      return conflict;
    }
    throw error;
  }
};

export const deleteBlogPostById = async (
  store: BlogPostStore,
  id: string
): Promise<{ ok: true } | { ok: false; code: 'NOT_FOUND'; message: string }> => {
  const deleted = await store.delete(id);
  if (!deleted) {
    return { ok: false, code: 'NOT_FOUND', message: 'Post not found' };
  }
  return { ok: true };
};
