/**
 * GET /api/admin/posts — list all posts (draft + published). Requires admin token.
 */
import { defineEventHandler } from 'h3';
import { requireAdminBlog } from '../../../utils/admin-handler';

export default defineEventHandler(async (event) => {
  return requireAdminBlog(event).listAllPosts();
});
