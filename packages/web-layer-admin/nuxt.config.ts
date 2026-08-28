/**
 * Publishable Nuxt layer: blog back-office pages and write APIs.
 *
 * Consumed by `@tgmc/web` via `extends: ['@tgmc/web-layer-admin']`.
 * Provides:
 * - `app/pages/admin/**`
 * - `server/api/admin/**`
 * - admin token helpers (client) and Bearer auth (server)
 *
 * Host app owns `runtimeConfig.adminToken` / `public.adminWritesEnabled`
 * and injects `event.context.adminBlog` via `server/plugins/admin-blog.ts`.
 */
import { defineNuxtConfig } from 'nuxt/config';

export default defineNuxtConfig({
  // Routes and APIs are auto-merged from this layer's app/ and server/.
});
