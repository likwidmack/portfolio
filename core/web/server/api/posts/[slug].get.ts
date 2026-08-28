/**
 * GET /api/posts/:slug — published post by slug (404 if missing or draft).
 */
import { createError, defineEventHandler, getRouterParam } from 'h3';
import { getBlogPostStore } from '../../db/blog-store';
import { renderBlogMarkdown } from '../../utils/render-blog-markdown';
import { getPublishedPostBySlug } from './service';
import { blogPostStoreOptionsFromRuntimeConfig } from './store-options';

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug');
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Missing slug' });
  }

  const config = useRuntimeConfig(event);
  const store = getBlogPostStore(blogPostStoreOptionsFromRuntimeConfig(config));
  const post = await getPublishedPostBySlug(store, slug);

  if (!post) {
    throw createError({ statusCode: 404, statusMessage: 'Post not found' });
  }

  return {
    ...post,
    html: renderBlogMarkdown(post.body),
  };
});
