/**
 * Server-side content collection read.
 * Avoids @nuxt/content client WASM SQLite races during SPA navigations.
 *
 * GET /api/content/:collection?mode=first|all&slug=optional
 */
import type { Collections } from '@nuxt/content';
import { queryCollection } from '@nuxt/content/server';
import { createError, getQuery, getRouterParam } from 'h3';

const ALLOWED = new Set<keyof Collections>([
  'home',
  'resume',
  'product',
  'gallery',
  'docs',
  'caseStudies',
  'decisionCards',
]);

export default defineEventHandler(async (event) => {
  const collectionParam = getRouterParam(event, 'collection') || '';
  if (!ALLOWED.has(collectionParam as keyof Collections)) {
    // Constant message — do not echo the raw router param (log injection / noisy monitoring).
    throw createError({ statusCode: 404, statusMessage: 'Unknown collection' });
  }

  const collection = collectionParam as keyof Collections;
  const query = getQuery(event);
  const mode = String(query.mode || 'first');
  const slug = typeof query.slug === 'string' ? query.slug.trim() : '';
  const path = typeof query.path === 'string' ? query.path.trim() : '';

  let qb = queryCollection(event, collection);
  if (slug) {
    qb = qb.where('slug', '=', slug);
  }
  if (path) {
    qb = qb.where('path', '=', path.startsWith('/') ? path : `/${path}`);
  }

  if (mode === 'all') {
    return qb.all();
  }
  return qb.first();
});
