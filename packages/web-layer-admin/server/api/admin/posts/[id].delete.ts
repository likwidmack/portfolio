/**
 * DELETE /api/admin/posts/:id — delete a blog post. Requires admin token.
 */
import { createError, defineEventHandler } from 'h3';
import { requireAdminBlog, requirePostId } from '../../../utils/admin-handler';

export default defineEventHandler(async (event) => {
  const id = requirePostId(event);
  const result = await requireAdminBlog(event).deleteBlogPostById(id);

  if (!result.ok) {
    throw createError({
      statusCode: 404,
      statusMessage: result.message,
    });
  }

  return { ok: true };
});
