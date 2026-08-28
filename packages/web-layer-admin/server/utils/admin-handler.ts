/**
 * Shared setup for admin post API handlers (auth gate + host-injected blog API).
 */
import { createError, getRouterParam, type H3Event } from 'h3';
import { requireAdminToken } from './admin-auth';
import type { AdminBlogApi } from './admin-blog-api';

/**
 * Require admin auth and return the host-injected blog API for this request.
 */
export function requireAdminBlog(event: H3Event): AdminBlogApi {
  const config = useRuntimeConfig(event);
  requireAdminToken(event, config.adminToken);
  const api = event.context.adminBlog;
  if (!api) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Admin blog API not configured (host Nitro plugin missing)',
    });
  }
  return api;
}

/**
 * Read `:id` from the route or throw 400.
 */
export function requirePostId(event: H3Event): string {
  const id = getRouterParam(event, 'id');
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing id' });
  }
  return id;
}
