/**
 * GET /api/posts — list published blog posts.
 */
import { defineEventHandler } from 'h3';
import { getBlogPostStore } from '../../db/blog-store';
import { listPublishedPosts } from './service';
import { blogPostStoreOptionsFromRuntimeConfig } from './store-options';

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  const store = getBlogPostStore(blogPostStoreOptionsFromRuntimeConfig(config));
  return listPublishedPosts(store);
});
