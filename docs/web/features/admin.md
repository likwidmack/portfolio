# Docker-only admin

The portfolio admin UI runs **only** via the standalone Docker admin stack. It is not bundled into `@tgmc/web`, `npm run dev`, or AWS Lambda.

**Package README:** `core/admin/README.md` · **Layer:** [`packages/web-layer-admin/README.md`](../../../packages/web-layer-admin/README.md)

## Why a separate app

- **Security:** Admin routes and `ADMIN_TOKEN` never ship in the public Lambda bundle.
- **Local tooling:** MinIO emulates S3/CDN for all environments without touching AWS.
- **One UI, three stores:** SQLite, Postgres, and DynamoDB Local run side by side; the nav selector picks which backend to CRUD.

## Architecture

```mermaid
flowchart LR
  subgraph host["Host (127.0.0.1)"]
    Browser["Browser :4400"]
  end

  subgraph stack["tgmc-admin Compose"]
  Admin["admin\n@tgmc/admin"]
  SQLite["SQLite\n./data/admin.sqlite"]
  PG["postgres :5432"]
  DDB["dynamodb-local"]
  MinIO["minio :9000"]
  end

  Browser --> Admin
  Admin -->|db=sqlite| SQLite
  Admin -->|db=postgres| PG
  Admin -->|db=dynamodb| DDB
  Admin --> MinIO
  Admin -.->|sync read-only| Output[".output/{local,development,test}/public"]
```

| Piece   | Path                                |
| ------- | ----------------------------------- |
| App     | `core/admin` (`@tgmc/admin`)        |
| Layer   | `packages/web-layer-admin`          |
| Compose | `docker/docker-compose.admin.yml`   |
| Helper  | `scripts/docker-admin.mjs`          |
| Env     | `.env.admin.example` → `.env.admin` |

## Surfaces

| Route             | Purpose                                          |
| ----------------- | ------------------------------------------------ |
| `/admin`          | Sign in with `ADMIN_TOKEN` ([session](#session)) |
| `/admin/blog`     | Blog CRUD (from `@tgmc/web-layer-admin`)         |
| `/admin/messages` | List/delete contact messages                     |
| `/admin/cdn`      | List/upload/delete/sync assets in local MinIO    |
| `/admin/media`    | DAM: upload, preview grid, drawer, variants      |

- **Layout.** Pages use the theme's `.page-with-nav` without a side nav, so `core/admin/assets/css/admin.scss` makes the body span the whole row (the theme would put it in the narrow nav column).
- **Navigation.** `AdminNav` marks the current section with `aria-current="page"` and an underline plus weight (not colour alone), including nested routes such as the blog editor (`app/utils/admin-nav.ts`). Each link is at least 44px wide and tall (`touch-target($square: true)`), so short labels such as "CDN" still meet the touch floor.
- **CDN page.** Upload and sync report their result ("Uploaded …", "Synced N file(s) from …") after the list reloads; uploads are base64-encoded in chunks (`app/utils/base64.ts`), so large files work. Choosing a file fills **Object key** with its name unless you typed a key yourself (`app/utils/upload-key.ts`), and the form clears after each upload, so the next upload never reuses (and overwrites) the previous key. The object table scrolls inside its own labelled, keyboard-focusable box, never the page; Delete leads each row and is named after its object, and each row's key is its row header. After a delete, focus moves to the next row's Delete (else the previous one, else the status line). Delete is immediate (no Undo yet — see the [TODO](./interaction-redesign.md#todo)).
- **Form labels.** Every `label(for=…)` names a control in the same file (`core/admin/tests/admin-form-labels.spec.ts`). `UiInputText`, `UiTextarea`, `UiPassword` and `UiSelect` put the id on the form control whether it comes from `input-id`, `#id` or `id="…"`; `input-id` wins when both are set, and PrimeVue's wrapper never gets the id (`core/web/tests/ui-control-id.spec.ts`). PrimeVue's select control is a `<span role="combobox">`, which a label click can't focus natively, so `UiSelect` forwards clicks on its `label[for]` to it.

## Database selection

Use the **Database** dropdown in the admin nav. Values are **database backends**, not `SYS_ENV` stack names:

| UI value   | Backend        | Data location                                                                     |
| ---------- | -------------- | --------------------------------------------------------------------------------- |
| `sqlite`   | SQLite         | `./data/admin.sqlite` (host volume)                                               |
| `postgres` | PostgreSQL 16  | `tgmc-postgres-admin` container                                                   |
| `dynamodb` | DynamoDB Local | `tgmc-dynamodb-admin` volume (persists), `portfolio-admin-*` tables incl. `Media` |

- Stored with the token in the admin session (`tgmc-admin-session`, see [Session](#session)).
- Sent on every admin API call as `X-Admin-Database` by `adminFetch`.
- Server may also accept `?db=sqlite|postgres|dynamodb` on admin APIs.

Internally, stores still use the existing adapters. The selection is passed to the store factories as an explicit `dataBackend`, so it wins over any `DATA_BACKEND` in the admin container's environment and over the `SYS_ENV` default (`development` now defaults to DynamoDB). `SYS_ENV` is only used to pick the CDN sync output dir:

| Database   | Store `dataBackend` | CDN sync output dir          |
| ---------- | ------------------- | ---------------------------- |
| `sqlite`   | `sqlite`            | `.output/local/public`       |
| `postgres` | `postgres`          | `.output/development/public` |
| `dynamodb` | `dynamodb`          | `.output/test/public`        |

## Session

The admin session belongs to one browser tab. It is a single `sessionStorage` key, `tgmc-admin-session`, holding `{ v: 1, token, database }`. It is cleared when the tab closes, and a tab opened from the address bar starts signed out. A duplicated tab, or one opened from an admin page, can start with a copy of the session (browsers copy `sessionStorage` to such tabs); after that the two copies change independently.

- **One owner.** `useAdminSession()` (`packages/web-layer-admin/app/composables/useAdminSession.ts`) is what pages and components use. It returns `token`, `database`, `databaseLabel`, `signedIn`, `signIn`, `signOut` and `setDatabase`, and it writes every change. The `admin-session.client` plugin also touches the key: it loads it with `loadAdminSession` (which can rewrite it while converting the old keys) and clears the token through `signOut` after a `401`. Pages and components never read or write `sessionStorage` themselves; the pure storage helpers live in `app/utils/admin-session.ts`.
- **Loaded once.** The `admin-session.client` plugin reads the key before the first render. After that, every change updates memory first and then writes the key. When the visitor is signed out and on the default database (`sqlite`), the key is removed.
- **Old keys.** The earlier `portfolio.adminToken` and `portfolio.adminDatabase` keys are converted once: the new key is written before the old ones are removed. If `tgmc-admin-session` already exists, the old keys are just removed.
- **Blocked storage.** If `sessionStorage` is blocked or full, the session stays in memory, so sign-in still works until the page reloads.
- **Client-rendered routes.** Because the session only exists in `sessionStorage`, the layer's `nuxt.config.ts` sets `routeRules` with `ssr: false` for `/admin` and `/admin/**`. Server-rendered HTML would always be signed out and would not match the page after hydration.
- **Clear saved token** on the sign-in page signs out but keeps the selected database.
- **Token check.** Continue sends the token to `GET /api/admin/session` (`verifyAdminToken` in `app/utils/admin-fetch.ts`) before saving it; the button reads "Checking…" meanwhile. A rejected token (401) shows the server's reason when it gives one — "Admin writes are disabled (ADMIN_TOKEN not configured)" on a stack without a token — and otherwise "That token is not valid for this environment."; focus returns to the field and nothing is saved. A server error reads "The admin server failed (5xx: …) — check its logs, then try again."; no response reads "Could not reach the admin server — try again." (copy: `app/utils/admin-sign-in-messages.ts`).
- **Token compare.** The server compares SHA-256 digests of the sent and expected tokens with `timingSafeEqual`, so neither the answer nor its timing reveals the token's length (`server/utils/admin-auth.ts`).

### Admin requests

Use `useAdminFetch()` (the plugin's `$adminFetch`) instead of `$fetch` with hand-built headers. It is client-only and throws if the plugin has not run.

- Each request gets `Authorization: Bearer <token>` (when signed in) and `X-Admin-Database: <database>`, read from the in-memory session rather than from storage.
- Requests to other origins never get these headers. The request URL, its `baseURL`, and the URL built from both must all stay on the page's origin.
- A `401` signs out and sends the visitor to `/admin?expired=1&redirect=<current page>`. The sign-in page shows "Session expired — enter the token again.", moves keyboard focus to the token field, and, after the token is entered, returns the visitor to that page. When several requests fail at once, they share one navigation.
- On the sign-in page itself, a `401` only clears the token; it does not navigate.
- A stale `401` is ignored. If the request was sent with a different token (or none) than the session now holds, the token entered since stays signed in.
- The caller still receives the original `401` error.

### Guarded pages and redirects

- Token-gated pages declare `definePageMeta({ middleware: 'admin-auth' })`: the blog list and editor, messages, CDN and media pages. When admin writes are enabled and nobody is signed in, the middleware sends the visitor to `/admin?redirect=<page>`. It skips the sign-in page and does nothing on the server.
- After sign-in, `?redirect=` is followed only when it is a same-origin `/admin/…` path other than the sign-in page, checked after `..` segments are resolved. Backslashes, whitespace and control characters are rejected. Anything else goes to `/admin/blog`. The `redirect` added after a `401` follows the same rule.
- The media page uses `@tgmc/media-client` with `getToken: () => token.value` from `useAdminSession()`. A `401` while loading the list (or the next page) signs out and goes to the expired sign-in page; its other calls do not handle `401` yet (see the [TODO](./interaction-redesign.md#todo)).

Tests: `cd core/web && npx vitest run tests/web-layer-admin`.

## Commands

```bash
cp .env.admin.example .env.admin   # set ADMIN_TOKEN
npm run docker:admin               # all DBs + MinIO + admin :4400
npm run docker:admin:down
npm run docker:build:admin         # image build only
npm run build:admin                # Nuxt build → .output/admin
```

Open `http://127.0.0.1:4400/admin` after healthchecks pass.

`docker:admin` with `--build` prepares `.output/local`, `.output/development`, `.output/test`, and `.output/admin` via `scripts/prepare-nitro-output.mjs` so CDN sync and the admin image have staged assets.

## Environment variables

Copy `.env.admin.example` to `.env.admin`. Required for writes:

| Variable                                         | Purpose                                                             |
| ------------------------------------------------ | ------------------------------------------------------------------- |
| `ADMIN_TOKEN` / `NUXT_ADMIN_TOKEN`               | Shared secret for Bearer auth                                       |
| `ADMIN_SQLITE_DATABASE_URL`                      | e.g. `file:/app/data/admin.sqlite`                                  |
| `ADMIN_POSTGRES_DATABASE_URL`                    | e.g. `postgres://portfolio:portfolio@postgres:5432/portfolio_admin` |
| `DYNAMO_TABLE` / `NUXT_DYNAMO_TABLE`             | Messages table (default `portfolio-admin-Messages`)                 |
| `DYNAMO_POSTS_TABLE` / `NUXT_DYNAMO_POSTS_TABLE` | Posts table (default `portfolio-admin-Posts`)                       |
| `AWS_REGION`                                     | DynamoDB region (default `us-west-2`)                               |
| `AWS_ENDPOINT_URL`                               | `http://dynamodb:8000` inside Compose                               |
| `DEFAULT_ADMIN_DATABASE`                         | UI default (`sqlite` in code; the Docker stack sets `dynamodb`)     |
| `ADMIN_DATABASES`                                | Comma list enabled in UI                                            |
| `S3_BUCKET`                                      | MinIO bucket (default `portfolio-assets`)                           |
| `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD`        | MinIO credentials                                                   |
| `MEDIA_LOCAL_ROOT`                               | Local DAM SQLite/blobs root (default `/app/data/admin-media`)       |
| `MEDIA_API_URL`                                  | Optional forward target for portfolio `/api/media/*`                |
| `MEDIA_API_TOKEN`                                | Bearer for remote media API (falls back to `ADMIN_TOKEN`)           |
| `MEDIA_PUBLIC_BASE_URL`                          | Optional base for local DAM media URLs (default same-origin `/m/…`) |

Ports (host bindings, all `127.0.0.1`):

| Port   | Service                               |
| ------ | ------------------------------------- |
| `4400` | Admin UI                              |
| `4410` | MinIO S3 API (public bucket)          |
| `4411` | MinIO console                         |
| `5433` | Postgres (optional host access)       |
| `8001` | DynamoDB Local (optional host access) |

## Admin API

All routes require `Authorization: Bearer <ADMIN_TOKEN>` unless noted. Include `X-Admin-Database` (or `?db=`) for data-backed routes.

| Method   | Path                                      | Database-aware                                                                        |
| -------- | ----------------------------------------- | ------------------------------------------------------------------------------------- |
| `GET`    | `/api/admin/session`                      | No — `{ ok: true }` for the admin token, else `401`; always `Cache-Control: no-store` |
| `GET`    | `/api/admin/posts`                        | Yes                                                                                   |
| `POST`   | `/api/admin/posts`                        | Yes                                                                                   |
| `GET`    | `/api/admin/posts/:id`                    | Yes                                                                                   |
| `PUT`    | `/api/admin/posts/:id`                    | Yes                                                                                   |
| `DELETE` | `/api/admin/posts/:id`                    | Yes                                                                                   |
| `GET`    | `/api/admin/messages`                     | Yes                                                                                   |
| `DELETE` | `/api/admin/messages/:id`                 | Yes                                                                                   |
| `GET`    | `/api/admin/cdn/objects`                  | No (MinIO only)                                                                       |
| `PUT`    | `/api/admin/cdn/objects`                  | No                                                                                    |
| `DELETE` | `/api/admin/cdn/objects?key=`             | No                                                                                    |
| `POST`   | `/api/admin/cdn/sync`                     | Yes (picks `.output/<sysEnv>/public` from selected DB)                                |
| `GET`    | `/api/admin/media/assets`                 | No (local DAM or `MEDIA_API_URL`)                                                     |
| `POST`   | `/api/admin/media/assets`                 | No                                                                                    |
| `GET`    | `/api/admin/media/assets/:id`             | No                                                                                    |
| `DELETE` | `/api/admin/media/assets/:id`             | No                                                                                    |
| `POST`   | `/api/admin/media/assets/:id/materialize` | No                                                                                    |
| `GET`    | `/api/admin/media/jobs/:id`               | No                                                                                    |

Public site still exposes `POST /api/messages` (contact form). Listing/deleting messages is admin-only.

See also [API UML](../reference/api-uml.md) and [messages API](./messages-api.md).

## Local media library (DAM)

`/admin/media` is separate from MinIO CDN. The page uses `@tgmc/media-client` against `/api/admin/media/*`. By default the admin server uses `@tgmc/media` with SQLite + filesystem under `MEDIA_LOCAL_ROOT` (Compose: `/app/data/admin-media` on the `./data` volume).

**Layout:** drop zone (drag-and-drop or browse; images, SVG, audio, video, 3D / XR, documents; one file at a time with “Uploading N of M · name” in a `role="status"` line; each new asset is prepended as it lands — no Refresh button) → **Kind** segmented control with counts (`image` / `svg` / `audio` / `video` / `model` / `document`, client-side over the loaded assets; a note appears while more can be loaded) → **Tag** filter chips when any asset has `meta.tags` → thumbnail grid (`app/components/AdminMediaTile.vue`: the `previewUrl` image for images and SVG, otherwise the kind's Lucide icon and MIME type — `app/utils/media-kind.ts`; filename, kind icon and label, size, tags; a broken preview falls back to the icon) → **Load more** below the grid (next 100-asset API page, appended without duplicates — repeated rows count toward the next offset, so a page of rows already loaded still moves paging on; a `role="status"` line says how many were added and when all are shown; when the last page has loaded the button goes away and focus moves to the first new tile, or the page heading; it is disabled while a delete can still be undone or its request is in flight, because the server still counts the hidden row and the next offset would be off by one) → **detail drawer** (`app/components/AdminMediaDrawer.vue`; a sticky side panel ≥1080 px, capped at the viewport height and scrolling inside so its controls stay reachable; below that a modal full-screen sheet that also shows the page's error / Undo / status line, `app/components/AdminMediaMessages.vue`) with the preview by kind (image, `<audio>` / `<video>` with `preload="metadata"`, or a facts panel for 3D and documents), type, size, **Public URL** (wraps; **Copy URL** and **Open** in a new tab), storage **path** (`m/pf/i/<name>.<ext>`, wraps instead of scrolling) + short id + Copy (both copies report in a `role="status"` line, including a failed copy), **Tags** add/remove (`PATCH …/assets/:id`), variants (role, catalog code and key path) with status words (✓ Ready / ◷ Processing / ✕ Failed), and **Make a variant** presets (`app/utils/media-presets.ts`: Card = catalog `640` webp, Hero = catalog `1920` avif — both replace their object in place when made again — and Square 800×800 as a custom recipe with a fresh `@c-…` key each time; image-only for now). Uploading a filename that is already taken shows “… is already in the library as <path>. Rename it to <name>-2.<ext> and upload again.” (409 `name_conflict`; names are unique per kind whatever the extension, so `hero.jpg` conflicts with `hero.png`). A filename whose extension does not match the file type is rejected with the corrected filename. **Custom recipe (JSON)…** reveals the role + JSON editor only when chosen. Re-making a catalog variant keeps the existing one ready until the new one succeeds. The variant section lives in `app/components/AdminMediaVariants.vue` (the page supplies the delete controls through its slot). Messages name the file, not the id. Editorial facets stay on `meta.tags` / facet keys — not extra kinds (see [`docs/packages/media.md`](../../packages/media.md)).

**Delete UX:** Delete… in the drawer → inline “Delete NAME and its variants?” Confirm/Cancel → tile hides immediately → 8s Undo banner (other deletes disabled) → API cascade delete on timer or page leave. Undo or API failure restores the tile (and the drawer if it was open); no API call on Undo.

**Keyboard and focus:** opening an asset focuses the drawer heading; `Esc` closes the drawer and returns focus to the tile that opened it — or the selected asset's tile when there is no opener, as after Undo or a failed delete restores the drawer; the page heading if that tile is gone (`drawerReturnTarget`) — except while focus is on a control that uses `Esc` itself (a select, combobox / listbox, the expanded popup trigger it is on, an input with suggestions, IME composition — `app/utils/media-drawer.ts`); `Tab` / `Shift+Tab` wrap inside the drawer while focus is in it (`app/utils/focus-trap.ts`). As a sheet (below 1080 px, `useMatchMedia`) the drawer is `aria-modal="true"`, the rest of the page is `inert` and does not scroll; both are restored when it closes. A slower detail response for an earlier click never replaces the asset picked last. Delete… moves focus to Confirm, and Cancel returns it to Delete…. After a delete, focus moves to the Undo banner.

Set `MEDIA_API_URL` to forward list/upload/materialize/jobs to the portfolio web `/api/media/*` API (Bearer `MEDIA_API_TOKEN` or `ADMIN_TOKEN`). Upload remote uses the web presign → PUT → complete flow from the admin server.

**Previews and URLs.** Every asset from the list, detail and upload routes carries `publicUrl` (the original) and `previewUrl` (the `t` thumbnail for images when it is ready, the original for SVG / audio / video, `null` for 3D and documents; [media-nuxt § Asset URLs](../../packages/media-nuxt.md#asset-urls)).

- **Local DAM:** the admin serves its own blobs on `/m/**` (`server/routes/m/[...path].ts`, the `@tgmc/media-nuxt` stand-in with `Range` support, so video plays in Safari), and URLs are same-origin (`/m/pf/i/<name>.<ext>`) unless `MEDIA_PUBLIC_BASE_URL` is set. Each uploaded image gets its `t` thumbnail synchronously through the web module's `ensureDefaultThumbnail` (skipped when a `t` child is pending or ready); a thumbnail failure only logs.
- **Forward (`MEDIA_API_URL`):** the web API builds the URLs; root-relative ones (web on a filesystem backend) are prefixed with `MEDIA_API_URL`. The browser must reach that host, so when `MEDIA_API_URL` is an internal Compose name (e.g. `http://web:4200`), set `MEDIA_PUBLIC_BASE_URL` on the web app to a host the browser can open.

**Follow-ups:** kind-appropriate presets, richer previews (3D poster, document excerpt, waveform) and the remaining drawer items — see [interaction-redesign.md#todo](./interaction-redesign.md#todo).

Plan: [`docs/plans/2026-09-22-003-feat-admin-media-ui-plan.md`](../../plans/2026-09-22-003-feat-admin-media-ui-plan.md).

## Local CDN (MinIO)

MinIO runs in every admin stack. After syncing public assets:

```env
NUXT_APP_CDN_URL=http://127.0.0.1:4410/portfolio-assets
```

Restart the public web/lambda service after changing `NUXT_APP_CDN_URL`. Details: cdn-guide.md.

**Sync workflow**

1. Build the public app for the target environment (`npm run build` with the right `SYS_ENV`, or let `docker:admin --build` stage outputs).
2. In admin → **CDN**, select the matching database (maps to `.output` dir above).
3. Click **Sync from .output**.

## Code walkthrough

Database selection is explicit in code — not tied to `SYS_ENV` on the admin container.

**Client** (`packages/web-layer-admin/app/utils/admin-fetch.ts`, provided by `plugins/admin-session.client.ts`):

```ts
// Same-origin requests only: Bearer token + X-Admin-Database from the in-memory session.
const { token, database } = getSession();
if (token) headers.set('Authorization', `Bearer ${token}`);
headers.set(ADMIN_DATABASE_HEADER, database);

// In a page:
const adminFetch = useAdminFetch();
await adminFetch('/api/admin/posts');
```

**Server resolve** (`core/admin/server/utils/admin-database.ts`):

```ts
// Precedence: ?db= → X-Admin-Database → DEFAULT_ADMIN_DATABASE
const selected = parseAdminDatabase(fromQuery) ?? parseAdminDatabase(fromHeader) ?? defaultAdminDatabase(config);

// The UI id is the store's explicit dataBackend (overrides DATA_BACKEND and the SYS_ENV default)
createMessageStore(messageStoreOptionsForDatabase(config, selected));
```

**Blog plugin** (`core/admin/server/plugins/admin-blog.ts`):

```ts
// Per-request store (public app uses a singleton instead).
nitroApp.hooks.hook('request', (event) => {
  const database = resolveAdminDatabase(event, config);
  const store = createBlogPostStoreForDatabase(config, database);
  event.context.adminBlog = {/* listAllPosts, … */};
});
```

**CDN sync** maps the selected database to a staged `.output` folder:

```ts
// sqlite → .output/local/public, postgres → .output/development/public, etc.
syncPublicAssetsToMinio(config, outputSysEnvForDatabase(database));
```

## Development notes

- **Do not** add `extends: ['@tgmc/web-layer-admin']` back to `core/web/nuxt.config.ts`.
- Admin reuses `core/web` `Ui*` components and `#web-server` store factories; keep imports on the documented entry boundaries ([utilities](../../packages/utilities.md)).
- `core/admin` `npm run dev` is for layer work only — you must supply DB URLs and tokens locally; prefer `docker:admin` for integration testing.
- Tests: `cd core/admin && npm test` (Vitest for `admin-database`, MinIO helpers, media-service, the `/m/**` route, media presets, the media UI utils (focus trap, kind icons, paging), the media page's drop zone / tiles / drawer / Load more / delete-undo contract, and the Nitro `externals.inline` list, and that `docker-compose.admin.yml` sets a `NUXT_*` name for every admin `runtimeConfig` key).
- `nitro.externals.inline` must keep `nuxt` and `@primeuix/utils` (Nuxt 4.6 renderer; [note](../../solutions/build-errors/nuxt-46-renderer-externalized-500.md)).
- `.output/admin` is built on the host, so container env only reaches `runtimeConfig` through `NUXT_<KEY>` / `NUXT_PUBLIC_<KEY>` names. When you add a `runtimeConfig` key, add its `NUXT_*` entry to the admin service in `docker/docker-compose.admin.yml`; when it has a plain twin, write it as `${NUXT_X:-<the twin's value>}` so a host override wins (both guarded by `core/admin/tests/docker-runtime-env.spec.ts`).

## Troubleshooting

| Symptom                                                    | Check                                                                                                                                                                      |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `401` on all admin APIs                                    | `ADMIN_TOKEN` in `.env.admin`; token pasted at `/admin`                                                                                                                    |
| "That token is not valid for this environment."            | The token doesn't match this stack's `ADMIN_TOKEN` (`.env.admin`); nothing was saved                                                                                       |
| "Admin writes are disabled (ADMIN_TOKEN not configured)"   | The server has no `ADMIN_TOKEN`: set it (or `NUXT_ADMIN_TOKEN`) in `.env.admin`, then `docker:admin` again                                                                 |
| "The admin server failed (5xx …)"                          | The session check crashed: read `docker compose -f docker/docker-compose.admin.yml logs admin`                                                                             |
| "Session expired" on `/admin`                              | The server rejected the saved token; enter the current `ADMIN_TOKEN` again                                                                                                 |
| Signed out in a new tab                                    | Expected — the session lives in `sessionStorage` and belongs to one tab                                                                                                    |
| Empty messages/posts after switch                          | Expected — each database is isolated; seed or create data per backend                                                                                                      |
| CDN sync skipped / 0 files                                 | Build missing for that DB’s `.output/<sysEnv>/public`; run `docker:admin --build`                                                                                          |
| Postgres connection errors                                 | `tgmc-postgres-admin` healthy; `ADMIN_POSTGRES_DATABASE_URL` uses host `postgres` inside Compose                                                                           |
| DynamoDB errors                                            | `dynamodb-init` completed; tables `portfolio-admin-Messages` / `portfolio-admin-Posts`                                                                                     |
| Port already in use                                        | Change `ADMIN_PORT`, `POSTGRES_PORT`, or `DYNAMODB_PORT` in `.env.admin`                                                                                                   |
| 500 "Either manifest or precomputed data must be provided" | Stale `.output/admin` from before the Nuxt 4.6 fix: `npm run build:admin`, then `docker:admin` ([note](../../solutions/build-errors/nuxt-46-renderer-externalized-500.md)) |
| `404` "Page not found: /" at `http://127.0.0.1:4400/`      | Stale `.output/admin` from before the `/` → `/admin` redirect (`routeRules` in `core/admin/nuxt.config.ts`): `npm run build:admin`, then `docker:admin`                    |
| CDN `500` "MinIO is not configured"                        | The admin service is missing `NUXT_S3_*` env; recreate with the current `docker/docker-compose.admin.yml` (`docker:admin`)                                                 |

## See also

- docker.md — all Compose stacks
- docker/README.md — port map + admin stack section
- [data-stores.md](../data-stores.md) — SQLite / Postgres / Dynamo adapters
- cdn-guide.md — production CDN vs local MinIO
