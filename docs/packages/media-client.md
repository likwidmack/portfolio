# `@tgmc/media-client`

Portable media HTTP client (browser + Node) for TGMC portfolio apps.

Package README: [`packages/media-client/README.md`](../../packages/media-client/README.md).

## Role

Talks to `/api/media/*` or `/api/admin/media/*` via path-agnostic `baseUrl` + Bearer token. Does not import `@tgmc/media` (Node SDK) or Nuxt.

```ts
import { createMediaApiClient } from '@tgmc/media-client';

const { token } = useAdminSession(); // @tgmc/admin's media page

const client = createMediaApiClient({
  baseUrl: '/api/admin/media',
  getToken: () => token.value,
});
```

## Host differences

| Method           | `/api/admin/media`                                               | `/api/media` (`@tgmc/media-nuxt`)                                                              |
| ---------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `uploadBase64`   | Yes (`POST /assets` base64 JSON)                                 | **No** — use `createPresign` → PUT → `completeIngest`                                          |
| `materialize`    | `variant` (+ `format`), `recipe`, or neither (the `t` thumbnail) | Same                                                                                           |
| `createPresign`  | Not used (admin forwards uploads server-side)                    | `{ kind, mime, filename, tenant? }` → `{ assetId, path, name, expiresAt, uploadUrl, headers }` |
| `completeIngest` | Via admin remote forward                                         | `{ assetId, path, … }` with optional `filename` / `meta` / `sha256`                            |

## Types, keys and name conflicts

`MediaAsset` has `tenant`, `name` and `path` (`m/{tenant}/{kind}/{name}.{ext}`, the CDN path without the leading slash); `MediaChild` has `variant` (`t`/`640`/`1280`/`1920`/`custom`) and `path`. `blobKey` is gone.

`materialize(id, { role?, variant?, format?, recipe?, useDefaultThumb? })`: `role` is a free label that defaults to the variant code. `variant: 'p'` is reserved and answered with 400.

A 409 from `createPresign`, `completeIngest` or `uploadBase64` whose body has `data.code === 'name_conflict'` is thrown as `MediaNameConflictError` (a `MediaApiError`) carrying `path`, `suggestedName`, `suggestedFilename` and `suggestedPath`; show the suggestion and let the user confirm a rename. Other 409s stay a plain `MediaApiError`. `parseNameConflictData(body)` is exported for hosts that forward the body (the admin proxy uses it) and returns `null` for any other body.

## Env / auth

Caller supplies Bearer via `getToken`. Hosts enforce `ADMIN_TOKEN`.

Requirements: [`docs/plans/2026-09-22-004-feat-media-host-adapters-plan.md`](../plans/2026-09-22-004-feat-media-host-adapters-plan.md).
