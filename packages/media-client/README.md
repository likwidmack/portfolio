# `@tgmc/media-client`

Portable media HTTP client for browser and Node. Talks to `/api/media/*` or `/api/admin/media/*` via a path-agnostic `baseUrl`.

```ts
import { createMediaApiClient } from '@tgmc/media-client';

const { token } = useAdminSession(); // in @tgmc/admin; any () => string works

const client = createMediaApiClient({
  baseUrl: '/api/admin/media',
  getToken: () => token.value,
});

await client.listAssets({ kind: 'image' });
// Admin-only upload shape:
await client.uploadBase64({ kind: 'image', contentBase64, mime: 'image/png', filename: 'a.png' });
// Portfolio `/api/media` ingest: createPresign → PUT → completeIngest({ ..., filename })
await client.materialize(id, { role: 'thumb', useDefaultThumb: true });
```

`uploadBase64` is **admin-only** (`POST …/assets`). Portfolio `/api/media` has no that route — use presign + complete.

`materialize({ useDefaultThumb: true })` (or omit `recipe`) works on both admin and `@tgmc/media-nuxt` hosts.

Does not depend on Nuxt or `@tgmc/media` (Node SDK).
