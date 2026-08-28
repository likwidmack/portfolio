# Encapsulation remediation (2026-08)

Follow-ups from the monorepo encapsulation / coverage review.

## Done

1. **SYS_ENV** — `nuxt.config.ts` imports `normalizeSysEnv` / `SysEnv` from `core/web/server/db/sys-env.ts` (single switch).
2. **Accents** — `shared/personalization.ts` owns `ACCENT_PRESETS` + `buildPersonalizationFoucScript()`; FOUC head script and `--portfolio-coral` / brand CSS vars consume that map (`ember` / `crimson`).
3. **Docker** — `docker/Dockerfile.app` + Compose build args replace duplicate `Dockerfile.api` / `Dockerfile.web` (ports 4100/4200).
4. **Admin layer** — host `server/plugins/admin-blog.ts` injects `event.context.adminBlog`; layer handlers no longer import `~~/server/**`. Blog entity types live in `@tgmc/web-layer-admin/shared/blog-types`.
5. **Tests** — `blog-postgres` / `blog-dynamodb` adapter specs; admin-handler + thin Nitro route wiring specs.
6. **Coverage** — Vitest thresholds on `@tgmc/utilities` (80/80/70/80) and `@tgmc/web` server db/api + personalization (70/65/55/70); CI runs both with `--coverage`. Also runs `sam-deploy-flow.test.mjs` in the deployable gate job.

## Verify

```bash
npm test
npx vitest run --coverage --config packages/utilities/vitest.config.mts
npx vitest run --coverage --config core/web/vitest.config.ts
```
