/**
 * GET /api/admin/posts/:id — get any post by id. Requires admin token.
 */
import { createError, defineEventHandler } from 'h3';
import { requireAdminBlog, requirePostId } from '../../../utils/admin-handler';

export default defineEventHandler(async (event) => {
  const id = requirePostId(event);
  const post = await requireAdminBlog(event).getPostById(id);

  if (!post) {
    throw createError({ statusCode: 404, statusMessage: 'Post not found' });
  }

  return post;
});
