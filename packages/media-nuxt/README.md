# `@tgmc/media-nuxt`

Nuxt module that mounts the Bearer-protected admin `/api/media/*` routes and resolves `MediaLibrary` (local SQLite/FS or AWS via `@tgmc/media-aws`).

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@tgmc/media-nuxt'],
});
```

On local backends (`sqlite` / `postgres`) uploads use a signed `PUT /api/media/_local-s3/<key>` and objects are served read-only at `/m/**`, so the same upload flow works without AWS.

Env (same as prior web wiring): `ADMIN_TOKEN`, `MEDIA_LOCAL_ROOT`, `MEDIA_LOCAL_SIGNING_SECRET` / `MEDIA_LOCAL_UPLOAD_MAX_BYTES` (local uploads), `MEDIA_TABLE` + `ASSETS_BUCKET` (AWS), `MEDIA_QUEUE_URL`, CloudFront distribution id for delete invalidation. Full reference: [`docs/packages/media-nuxt.md`](../../docs/packages/media-nuxt.md).

Does not include admin UI or `/api/admin/media/*` proxy — those stay in `@tgmc/admin`.
