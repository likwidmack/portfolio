/**
 * PUT /api/admin/posts/:id — update a blog post. Requires admin token.
 */
import { createError, defineEventHandler, readBody } from 'h3';
import type { AdminUpdatePostResult } from '../../../utils/admin-blog-api';
import { requireAdminBlog, requirePostId } from '../../../utils/admin-handler';

function updateErrorStatusCode(result: Exclude<AdminUpdatePostResult, { ok: true }>): number {
  if (!('code' in result) || result.code === undefined) {
    return 400;
  }
  switch (result.code) {
    case 'NOT_FOUND':
      return 404;
    case 'SLUG_CONFLICT':
      return 409;
    default: {
      const _exhaustive: never = result.code;
      void _exhaustive;
      return 400;
    }
  }
}

export default defineEventHandler(async (event) => {
  const id = requirePostId(event);
  const body = await readBody(event);
  const result = await requireAdminBlog(event).updateBlogPostFromBody(id, body);

  if (!result.ok) {
    throw createError({
      statusCode: updateErrorStatusCode(result),
      statusMessage: result.message,
    });
  }

  return result.value;
});
