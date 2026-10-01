# `@tgmc/media-client`

Portable media HTTP client (browser + Node) for TGMC portfolio apps.

Package README: `packages/media-client/README.md`.

## Role

Talks to `/api/media/*` or `/api/admin/media/*` via path-agnostic `baseUrl` + Bearer token. Does not import `@tgmc/media` (Node SDK) or Nuxt.

```ts
import { createMediaApiClient } from '@tgmc/media-client';

const client = createMediaApiClient({
  baseUrl: '/api/admin/media',
  getToken: () => readAdminToken(),
});
```

## Host differences

| Method           | `/api/admin/media`                                         | `/api/media` (`@tgmc/media-nuxt`)                                    |
| ---------------- | ---------------------------------------------------------- | -------------------------------------------------------------------- |
| `uploadBase64`   | Yes (`POST /assets` base64 JSON)                           | **No** — use `createPresign` → PUT → `completeIngest`                |
| `materialize`    | `recipe` or `useDefaultThumb` (default thumb when omitted) | Same — default thumb when `recipe` omitted / `useDefaultThumb: true` |
| `completeIngest` | Via admin remote forward                                   | Optional `filename` / `meta` / `sha256`                              |

## Env / auth

Caller supplies Bearer via `getToken`. Hosts enforce `ADMIN_TOKEN`.

Requirements: [`docs/plans/2026-09-22-004-feat-media-host-adapters-plan.md`](../plans/2026-09-22-004-feat-media-host-adapters-plan.md).
