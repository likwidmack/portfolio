# Portfolio page data loading

Portfolio, content, and notes pages use `useContentAsyncData` (`app/composables/useContentAsyncData.ts`) instead of bare `useAsyncData`.

Nuxt Content collections are loaded through **`fetchContentCollection`** → `GET /api/content/:collection` (Nitro + Content DB). Do **not** call client `queryCollection()` in page setup: the WASM adapter can race and return empty rows, which triggers `createError` and leaves Suspense stuck on the previous page until a hard refresh.

The content API allowlists collection names server-side and returns a constant `404 Unknown collection` (no raw router-param echo) for anything outside the set. Optional query params: `mode=first|all`, `slug`, `path` (used by technical docs).

In-app hubs: [`/gallery`](./gallery-and-docs.md) (feed + grid) and [`/docs`](./gallery-and-docs.md) (markdown from the repo `docs/` tree).

### Content DB vs app data stores

| Layer                                          | `local` / `development`   | `test` / `production` (Lambda)                                                                                |
| ---------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Nuxt Content** (pages, case studies, resume) | Default file SQLite (dev) | In-memory SQLite (`filename: ':memory:'`) restored from the build dump — **no** Content SQLite file on Lambda |
| **MessageStore / BlogPostStore**               | SQLite / Postgres         | **DynamoDB only**                                                                                             |

Do not put Content or app stores on Postgres for test/prod. Do not use `/tmp/*.sqlite` for Content on Lambda (still SQLite-on-serverless). See [data-stores.md](../data-stores.md).

## SPA navigation requirements

1. **No `pageTransition` / `layoutTransition` with `mode: 'out-in'`** — Nuxt wraps async `<script setup>` pages in `Suspense`. Vue’s `Transition(mode="out-in")` + `Suspense` can leave the entering page unmounted on client navigations until a full reload (`nuxt/nuxt#32371`). This app disables both transitions in `config-properties/app-prop.ts` (no enter/leave CSS was defined anyway).
2. **`NuxtPage` keyed by `route.fullPath`** in `app.vue` so each path gets a fresh page instance.
3. **Fetch with `useContentAsyncData` + `fetchContentCollection` (or `$fetch` for Notes/blog)** — reuse SSR payload only while hydrating; refetch on later client navigations. Handlers still run through a global lock as a defensive serialiser.
4. Bind templates to `computed()` wrappers (or the async `data` ref), not one-time `.value` copies.
5. Dynamic routes (`work/[slug]`, `blog/[slug]`, `docs/[...slug]`) use a reactive key + `watch` on the route param.
6. Avoid `Promise.all` of multiple content loads on one page; prefer sequential `useContentAsyncData` awaits.
