# `@tgmc/web-layer-admin`

Nuxt layer for portfolio admin: blog pages, write APIs, Bearer-token auth, and the browser admin session (token + selected database).

Consumed by **`@tgmc/admin`** (`core/admin`). It is **not** extended by the public `@tgmc/web` app.

Full guide: [`docs/web/features/admin.md`](../../docs/web/features/admin.md)

## What the layer provides

| Area   | Contents                                                                                                    |
| ------ | ----------------------------------------------------------------------------------------------------------- |
| Pages  | `app/pages/admin/**` (sign-in, blog list/edit), client-rendered                                             |
| APIs   | `server/api/admin/posts/**`                                                                                 |
| Client | `useAdminSession`, `admin-session.client` plugin (`$adminFetch`), `admin-auth` middleware, `admin-database` |
| Server | `admin-auth`, `admin-handler`, `admin-blog-api` types                                                       |

The host app (`core/admin`) must:

1. Set `runtimeConfig.adminToken` and per-database connection URLs.
2. Register `server/plugins/admin-blog.ts` to attach `event.context.adminBlog` per request.
3. Add messages/CDN routes and MinIO utilities (admin-only).

## Exports

```ts
import { requireAdminToken } from '@tgmc/web-layer-admin/server/utils/admin-auth';
import { useAdminSession } from '@tgmc/web-layer-admin/app/composables/useAdminSession';
import { useAdminFetch } from '@tgmc/web-layer-admin/app/utils/admin-fetch';
import { expiredSignInTarget } from '@tgmc/web-layer-admin/app/utils/admin-auth-redirect';
import { ADMIN_DATABASES } from '@tgmc/web-layer-admin/app/utils/admin-database';
```

Inside an app that extends the layer, these are also auto-imported. See `package.json` `exports` for the full list.

## Auth

- The browser keeps the token and the selected database in one `sessionStorage` key, `tgmc-admin-session`, which is cleared when the tab closes. `useAdminSession()` is the only code that reads or writes it.
- APIs expect `Authorization: Bearer <ADMIN_TOKEN>`.
- Server compares with `timingSafeEqual`; empty/missing token → **401** (fail-closed).
- In the browser, a `401` on an `adminFetch` call signs out and opens `/admin?expired=1`, which returns to the page after the token is entered again.
- Token-gated pages declare `definePageMeta({ middleware: 'admin-auth' })`.

## Database selection

- Client: stored in the admin session and sent as the `X-Admin-Database` header by `adminFetch`.
- Server: host resolves `sqlite` | `postgres` | `dynamodb` from header or `?db=` query.

Values map to existing store factories (`local` / `development` / `test` `SYS_ENV` internally).

## Request flow (commented)

```ts
// 1. The sign-in page and the nav selector update the session (kept in sessionStorage)
const { signIn, setDatabase } = useAdminSession();
signIn(token);
setDatabase('postgres');

// 2. adminFetch adds both headers to same-origin requests
await useAdminFetch()('/api/admin/posts');
// → Authorization: Bearer …, X-Admin-Database: postgres

// 3. Host resolves store per request (core/admin/server/utils/admin-database.ts)
const db = resolveAdminDatabase(event, config);
createBlogPostStoreForDatabase(config, db);
```
