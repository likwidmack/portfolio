# `@tgmc/web-layer-admin`

Nuxt layer for portfolio admin: blog pages, write APIs, Bearer-token auth, and database-selection helpers.

Consumed by **`@tgmc/admin`** (`core/admin`). It is **not** extended by the public `@tgmc/web` app.

Full guide: [`docs/web/features/admin.md`](../../docs/web/features/admin.md)

## What the layer provides

| Area   | Contents                                                       |
| ------ | -------------------------------------------------------------- |
| Pages  | `app/pages/admin/**` (token, blog list/edit)                   |
| APIs   | `server/api/admin/posts/**`                                    |
| Client | `admin-token`, `admin-database`, `useAdminDatabase` composable |
| Server | `admin-auth`, `admin-handler`, `admin-blog-api` types          |

The host app (`core/admin`) must:

1. Set `runtimeConfig.adminToken` and per-database connection URLs.
2. Register `server/plugins/admin-blog.ts` to attach `event.context.adminBlog` per request.
3. Add messages/CDN routes and MinIO utilities (admin-only).

## Exports

```ts
import { requireAdminToken } from '@tgmc/web-layer-admin/server/utils/admin-auth';
import { adminRequestHeaders } from '@tgmc/web-layer-admin/app/utils/admin-token';
import { readAdminDatabase } from '@tgmc/web-layer-admin/app/utils/admin-database';
import { useAdminDatabase } from '@tgmc/web-layer-admin/app/composables/useAdminDatabase';
```

See `package.json` `exports` for the full list.

## Auth

- Client stores the shared secret in `sessionStorage` (`portfolio.adminToken`).
- APIs expect `Authorization: Bearer <ADMIN_TOKEN>`.
- Server compares with `timingSafeEqual`; empty/missing token → **401** (fail-closed).

## Database selection

- Client: `sessionStorage` key `portfolio.adminDatabase` + `X-Admin-Database` header.
- Server: host resolves `sqlite` | `postgres` | `dynamodb` from header or `?db=` query.

Values map to existing store factories (`local` / `development` / `test` `SYS_ENV` internally).

## Request flow (commented)

```ts
// 1. Browser stores selection + token in sessionStorage
writeAdminDatabase('postgres');
writeAdminToken(process.env.ADMIN_TOKEN);

// 2. API calls include both headers
adminRequestHeaders();
// → { Authorization: 'Bearer …', 'X-Admin-Database': 'postgres' }

// 3. Host resolves store per request (core/admin/server/utils/admin-database.ts)
const db = resolveAdminDatabase(event, config);
createBlogPostStoreForDatabase(config, db);
```
