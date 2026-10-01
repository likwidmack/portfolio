---
title: Media Host Adapters - Plan
type: feat
date: 2026-09-22
topic: media-host-adapters
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
product_contract_source: ce-brainstorm
execution: code
---

# Media Host Adapters - Plan

## Goal Capsule

**Objective:** Ship a portable media HTTP client and a Nuxt route kit that mounts `/api/media/*`, then migrate `@tgmc/web` and `@tgmc/admin` onto them so hosts stop hand-copying media wiring.

**Product authority:** Step 4 only. Core SDK, AWS backend, and admin DAM UI behavior are already shipped — this step owns host integration packages and adoption, not new DAM features.

**Open blockers:** None.

**Stop:** Do not add a Next app/stub package, PWA/offline, or MinIO CDN changes in this step.

## Implementation status

Shipped: `@tgmc/media-client`, `@tgmc/media-nuxt`, web module adoption, admin page client, docs.

## Product Contract

### Summary

Add two workspace packages: a framework-agnostic media API client (browser/Node fetch + Bearer) and a Nuxt module that mounts the existing media HTTP surface and shared server factory. Refactor web to use the Nuxt kit for `/api/media/*`; refactor admin media UI to use the client against `/api/admin/media/*` (admin proxy role unchanged). Document, test, commit.

### Problem Frame

`@tgmc/media` is Node-safe only. Web and admin each wire MediaLibrary and HTTP by hand. There is no Next app in-repo, but a reusable client is the portable path for later hosts. Step 4 closes the “host adapters” gap from the media sequence without inventing new product UI.

### Key Decisions

- **Surface = Nuxt + portable HTTP client** `(session-settled: user chose 2 over Nuxt-only or dual Nuxt/Next packages)`
- **Nuxt piece = route kit** `(session-settled: user chose 2 over factory-only or full UI layer)`
- **Adopt on web + admin** `(session-settled: user chose 2 over web-only or packages-only)`
- **Done = packages + host migration + docs + commit** `(session-settled: user chose 2 over packages-only or Next stub)`
- **PWA out of scope** `(session-settled: user-approved — asked then continued without expanding step 4)`
- **Approach B — two packages (client + Nuxt)** `(session-settled: user chose B over one host package or client-on-@tgmc/media)`
- **Handlers live only in `@tgmc/media-nuxt`** `(session-settled: user-approved plan default — web drops duplicate route files)`
- **Admin `/api/admin/media/*` stays in admin** `(session-settled: user-approved plan default — page adopts client only)`

### How This Work Fits Together

- Core media SDK / AWS / admin UI (steps 1–3) — done; stable domain + HTTP + DAM page
- Host adapters (this plan) — client + Nuxt route kit + migrate web/admin
- Later (not this plan) — optional Next consumer of the client; optional PWA on public site

### Requirements

- R1. Ship a portable media HTTP client package usable from browser and Node (Bearer + base URL; covers list/get/upload/delete/materialize/job poll).
- R2. Ship a Nuxt media module/package that mounts `/api/media/*` handlers and shared MediaLibrary resolution (local vs AWS as hosts already do).
- R3. Migrate `@tgmc/web` to consume the Nuxt route kit instead of owning duplicated media route/wiring files.
- R4. Migrate `@tgmc/admin` `/admin/media` to the portable client against `/api/admin/media/*`; keep admin local-library-or-forward proxy behavior.
- R5. Vitest covers client request shaping/auth headers and Nuxt/module or handler registration happy path (plus keep host tests green).
- R6. Document packages, entries, and env vars; update media package docs that still say “Step 4”.
- R7. Commit on the feature branch; do not start unrelated follow-ons.

### Non-Goals

- Next.js app or Next adapter stub package
- PWA / service worker / offline sync
- New admin DAM features beyond client adoption
- Replacing or merging MinIO CDN tools
- Absorbing `@tgmc/media` Node SDK into a browser bundle
- Cypress e2e for media hosts

### Acceptance Examples

- AE1. Web serves `/api/media/assets` via the Nuxt media module with Bearer admin auth still enforced.
- AE2. Admin media page lists/uploads/materializes using the portable client (no bespoke `$fetch` path duplication for those ops).
- AE3. A future Next (or plain Node) caller can depend on the client package alone without pulling Nuxt.

## Planning Contract

### Key Technical Decisions

- **KTD1. Package names `@tgmc/media-client` and `@tgmc/media-nuxt`** — Governs R1–R2. Matches settled two-package split; Next later depends only on client.
- **KTD2. Nuxt module (not layer)** — Governs R2–R3. Use `defineNuxtModule` + `addServerHandler` / server dir registration so hosts `modules: ['@tgmc/media-nuxt']` without `extends` conflict with `@tgmc/web-layer-admin`. Precedent contrast: `packages/web-layer-admin` is a layer for UI/pages; media needs route kit only.
- **KTD3. Move web media handlers + `getMediaLibrary` into `@tgmc/media-nuxt`** — Governs R2–R3. Delete `core/web/server/api/media/**` and `core/web/server/utils/media-library.ts` after module owns them; preserve auth (`requireMediaAdmin` / Bearer `ADMIN_TOKEN`) and AWS-vs-local resolution behavior.
- **KTD4. Client is fetch-based, path-agnostic base URL** — Governs R1, R4, AE2–AE3. Methods map to `/api/media/*` shapes; admin passes `baseUrl: '/api/admin/media'` (or absolute) so the same client hits the admin proxy without teaching the client about “admin vs public.”
- **KTD5. Admin keeps `media-service.ts` + `/api/admin/media/*`** — Governs R4. Only `app/pages/admin/media/index.vue` (and thin helpers) switch to `@tgmc/media-client`.
- **KTD6. Wire into `build:libs` / Nx** — Governs R5–R7. Add both packages to root `build:libs` (client always; media-nuxt may be Nuxt-source / noop build like web-layer-admin if handlers stay TS sources consumed by Nuxt).

### Assumptions

- Existing `/api/media/*` response/request contracts stay stable; client mirrors them rather than inventing a new DTO layer.
- Admin upload continues as base64 JSON body (current admin API); client exposes that shape for admin `baseUrl`, and optionally a separate helper for web presign→PUT→complete when `baseUrl` points at `/api/media`.
- `@tgmc/media` remains Node-only; no `/browser` entry on the SDK.

### Scope Boundaries

**In:** packages, web module adoption, admin page client adoption, docs, Vitest, commit.

**Out / deferred:** Next stub, PWA, extracting admin proxy into media-nuxt, CDN MinIO changes, Cypress.

### Risks

- **Nuxt module packaging** — handler paths / nitro externals for `better-sqlite3` / `@tgmc/media-aws` must match current web Nitro behavior. Mitigate: migrate one route first, smoke `nuxt prepare` / admin+web tests.
- **Upload dual path** — admin base64 vs web presign. Mitigate: client documents both; admin page uses ingest-via-base64 against admin proxy only in this step.

## Implementation Units

### U1. `@tgmc/media-client` package

**Goal:** Portable HTTP client for media list/get/upload/delete/materialize/job poll.

**Requirements:** R1, R5, AE3

**Dependencies:** None

**Files:**

- `packages/media-client/package.json`
- `packages/media-client/src/index.ts`
- `packages/media-client/src/create-media-api-client.ts` (or equivalent)
- `packages/media-client/tests/media-client.spec.ts`
- `packages/media-client/tsconfig*.json` / README as needed
- Root: `package.json` (`build:libs`), `tsconfig.json` project refs if used

**Approach:**

1. Nx lib with `tgmc-portfolio` source export pattern like `@tgmc/media`
2. `createMediaApiClient({ baseUrl, getToken, fetch? })` returning typed methods aligned to existing routes
3. Default `fetch` for browser and Node 24; no Nuxt/`$fetch` dependency
4. Unit-test with mocked `fetch`: Authorization header, URL join, error status propagation

**Patterns to follow:** `@tgmc/utilities` entry hygiene (no accidental Node-only imports); `@tgmc/media` package.json export map

**Test scenarios:**

- Happy: `listAssets` calls `GET {baseUrl}/assets` with `Authorization: Bearer …`
- Happy: `materialize` POSTs role/recipe body and returns job payload
- Error: non-2xx response rejects with status/message usable by UI
- Edge: trailing slash on `baseUrl` does not double-slash paths

**Verification:** `npm test --workspace=@tgmc/media-client` (or Nx target) passes; package builds.

### U2. `@tgmc/media-nuxt` route kit

**Goal:** Nuxt module that registers `/api/media/*` and owns MediaLibrary resolution (local SQLite/FS vs AWS).

**Requirements:** R2, R5, AE1

**Dependencies:** U1 optional (no hard dep); depends on `@tgmc/media`, `@tgmc/media-aws`, `@tgmc/web-layer-admin` auth helper (or duplicate thin require using same `requireAdminToken` import path already used by web)

**Files:**

- `packages/media-nuxt/package.json`
- `packages/media-nuxt/src/module.ts` (or `module.ts` at package root)
- `packages/media-nuxt/runtime/server/utils/media-library.ts` (moved from web)
- `packages/media-nuxt/runtime/server/api/media/**` (moved from `core/web/server/api/media/**`)
- `packages/media-nuxt/tests/*` (module registration or library resolver tests)
- Package README

**Approach:**

1. Move handlers + `media-library.ts` from web into the package runtime
2. Module registers those handlers under `/api/media/*`
3. Preserve env knobs: `MEDIA_TABLE`/`ASSETS_BUCKET`, `MEDIA_LOCAL_ROOT`, `MEDIA_QUEUE_URL`, `ADMIN_TOKEN`
4. Prefer Nuxt-source consumption (`tgmc-portfolio` / direct TS) similar to layer packages if build of Nitro handlers as dist is painful — document the choice in README

**Patterns to follow:** Current `core/web/server/utils/media-library.ts` and `core/web/server/api/media/*`; auth via `@tgmc/web-layer-admin/server/utils/admin-auth`

**Test scenarios:**

- Happy: `getMediaLibrary` uses local adapters when AWS env unset (temp dir)
- Happy: `requireMediaAdmin` rejects missing Bearer (reuse assert pattern)
- Integration-ish: module exports / handler files resolve (smoke import test)
- Test expectation for full Nitro mount: covered in U3 host smoke if module unit test cannot boot Nuxt cheaply — note in Verification

**Verification:** Package tests pass; handlers no longer need to live under `core/web`.

### U3. Migrate `@tgmc/web` onto `@tgmc/media-nuxt`

**Goal:** Web app loads the media module; duplicate media routes/utils removed.

**Requirements:** R3, AE1

**Dependencies:** U2

**Files:**

- `core/web/nuxt.config.ts` (add module)
- `core/web/package.json` (dependency)
- Delete: `core/web/server/api/media/**`, `core/web/server/utils/media-library.ts`
- Adjust any imports of `media-library` from remaining web code
- Existing web media tests if present — update paths/mocks

**Approach:**

1. Add `@tgmc/media-nuxt` to modules (and deps)
2. Remove duplicated server files
3. Confirm Bearer-protected list/get/materialize still work under `SYS_ENV=local` mentally via tests

**Patterns to follow:** How `@tgmc/web-layer-admin` is declared as a dependency/extends in admin/web configs

**Test scenarios:**

- If web has media route tests: update to still pass against module-provided handlers
- Smoke: `nuxt prepare` / existing web unit suite remains green for non-media tests
- Covers AE1: auth failure still 401 without token (handler-level or util test living in media-nuxt)

**Verification:** Web build/prepare succeeds; media API behavior unchanged from step 2.

### U4. Migrate `@tgmc/admin` media page to `@tgmc/media-client`

**Goal:** Admin DAM UI uses the portable client against `/api/admin/media/*`.

**Requirements:** R4, R5, AE2

**Dependencies:** U1

**Files:**

- `core/admin/package.json`
- `core/admin/app/pages/admin/media/index.vue`
- Optional thin composable under `core/admin/app/composables/` if it clarifies token wiring
- `core/admin/tests/media-service.spec.ts` stays (proxy unchanged)
- Optional `core/admin/tests/media-client-usage.spec.ts` only if logic leaves the page

**Approach:**

1. Construct client with `baseUrl: '/api/admin/media'` and `getToken` from existing admin token helpers
2. Replace direct `$fetch` list/upload/delete/materialize/job poll with client methods
3. Leave `server/utils/media-service.ts` and `/api/admin/media/*` as-is

**Patterns to follow:** Current page’s `adminRequestHeaders` / `readAdminToken` / 401 → `/admin` navigation

**Test scenarios:**

- Existing media-service Vitest still passes
- Prefer extracting a tiny pure helper for client factory if page-only changes are hard to unit-test; otherwise Verification = manual page ops + service tests
- Covers AE2: page no longer inlines URL path strings for each op (client owns paths)

**Verification:** `cd core/admin && npm test` green; page compiles.

### U5. Docs, workspace wiring, commit

**Goal:** Document packages; update catalogs; wire builds; commit step 4 only.

**Requirements:** R6, R7

**Dependencies:** U1–U4

**Files:**

- `docs/packages/media-client.md`, `docs/packages/media-nuxt.md` (new)
- `docs/packages/media.md` (Step 4 → package names)
- `docs/packages/README.md`, `docs/README.md` / `_catalog.md` as needed
- `core/admin/README.md` / `docs/web/features/admin.md` (client note)
- `package.json` `build:libs`
- This plan: mark implementation status when committing

**Approach:**

1. Document env vars and import examples
2. Add workspaces packages to build scripts
3. Commit conversation-scoped paths only on `feat/media-library-sdk`

**Test expectation:** none — docs/chore; Verification = links resolve, `build:libs` includes new packages where applicable

**Verification:** Docs catalog lists both packages; commit created; stop (no PR unless asked).

## Verification Contract

- `npm test --workspace=@tgmc/media-client` (U1)
- Package tests for `@tgmc/media-nuxt` (U2)
- `cd core/admin && npm test` (U4; includes media-service)
- `npm run build:libs` includes new client (and media-nuxt if it has a build target)
- Optional: `nuxt prepare` for `core/web` / `core/admin` after module wiring

## Definition of Done

- [x] U1–U5 complete against R1–R7
- [x] AE1–AE3 satisfied or explicitly evidenced by tests/docs
- [x] No Next stub, PWA, or CDN changes landed
- [x] Work committed on feature branch; stop for user direction on PR / further work

## Deferred / Open Questions

### From 2026-09-22 review

- Expand `@tgmc/media-aws` unit tests (Dynamo/S3/presign/SQS/worker) beyond `keys.spec.ts` — deferred as a larger follow-on suite.
- Include `@tgmc/media-client` and `@tgmc/media-nuxt` Vitest targets in root `npm test` / pre-push pipeline (today: workspace scripts only).
