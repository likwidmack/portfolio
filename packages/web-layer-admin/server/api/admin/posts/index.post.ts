/**
 * POST /api/admin/posts — create a blog post. Requires admin token.
 */
import { createError, defineEventHandler, readBody } from 'h3';
import { requireAdminBlog } from '../../../utils/admin-handler';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const result = await requireAdminBlog(event).createBlogPostFromBody(body);

  if (!result.ok) {
    throw createError({
      statusCode: result.code === 'SLUG_CONFLICT' ? 409 : 400,
      statusMessage: result.message,
    });
  }

  return result.value;
});
