/**
 * Attach the host blog store/service facade for admin layer handlers.
 * Admin APIs must not import ~~/server — they read `event.context.adminBlog`.
 */
import {
  createBlogPostFromBody,
  deleteBlogPostById,
  getPostById,
  listAllPosts,
  updateBlogPostFromBody,
} from '../api/posts/service';
import { blogPostStoreOptionsFromRuntimeConfig } from '../api/posts/store-options';
import { getBlogPostStore } from '../db/blog-store';

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('request', (event) => {
    const config = useRuntimeConfig(event);
    const store = getBlogPostStore(blogPostStoreOptionsFromRuntimeConfig(config));
    event.context.adminBlog = {
      listAllPosts: () => listAllPosts(store),
      getPostById: (id) => getPostById(store, id),
      createBlogPostFromBody: (body) => createBlogPostFromBody(store, body),
      updateBlogPostFromBody: (id, body) => updateBlogPostFromBody(store, id, body),
      deleteBlogPostById: (id) => deleteBlogPostById(store, id),
    };
  });
});
