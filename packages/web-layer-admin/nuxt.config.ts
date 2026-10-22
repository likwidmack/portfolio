/**
 * Publishable Nuxt layer: blog back-office pages and write APIs.
 *
 * Consumed by `core/admin` via `extends: ['@tgmc/web-layer-admin']`.
 * Provides:
 * - `app/pages/admin/**`
 * - `server/api/admin/**`
 * - the admin session (`useAdminSession`, `admin-session.client` plugin with `$adminFetch`,
 *   `admin-auth` middleware) and Bearer auth (server)
 *
 * Host app owns `runtimeConfig.adminToken` / `public.adminWritesEnabled`
 * and injects `event.context.adminBlog` via `server/plugins/admin-blog.ts`.
 */
import { defineNuxtConfig } from 'nuxt/config';

export default defineNuxtConfig({
  // Routes and APIs are auto-merged from this layer's app/ and server/.
  routeRules: {
    // The admin session lives in sessionStorage and is read by a client plugin, so these pages
    // must render client-only; server HTML would always be signed out and mismatch on hydration.
    '/admin': { ssr: false },
    '/admin/**': { ssr: false },
  },
});
