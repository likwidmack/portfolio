# In-app gallery and technical docs

The Nuxt app exposes two browse hubs that share the same pattern: a **root page**, a **grid or feed**, and **filter / group** controls.

| Route                     | Role                                                                | Chrome                                                              |
| ------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------- |
| [`/gallery`](/gallery)    | Social-style sample feed (reels, stills, code, diagrams)            | **Primary nav** label Gallery                                       |
| [`/docs`](/docs)          | Technical documentation sourced from the repo `docs/` markdown tree | **Work sub-nav** (`AppWorkSubNav`) — not in `AppPrimaryNav`         |
| [`/docs/...`](/docs/contributing) | Individual spec / runbook rendered from that markdown               | Linked from the docs catalog; Work sub-nav stays on Work pages only |

Public primary rail is **Work / About / Gallery / Writing / Code**. Docs, AI Lab (`/ai-lab`), and Process (`/process`) live under Work.

## Gallery

Content lives in `core/web/content/gallery.json` (Nuxt Content `gallery` collection). Posts are flattened from categories into a feed:

- **Default view: grid** — thumbnail tiles with platform tags (YouTube / Shorts / Reels / Still) and engagement stats tinted with `--portfolio-teal` (`.gallery-grid__stats`).
- **Feed** — vertical, snap-adjacent cards (Instagram / TikTok-like). In-view video loops muted; card stats use `.gallery-feed-card__stats`.
- **Group** — series (`Reels`, `Scripts`, `Code Snippets`, `3D / XR`, `Other Samples`).
- **Filter** — `Images`, `Video`, `Code`, `Diagrams`.

Helpers: `core/web/shared/gallery-types.ts` (`resolveGalleryAspect`, `resolveGalleryPlatform`, `galleryEngagementLabel`, `GALLERY_PLATFORM_LABEL`). Exhibit rendering: `app/components/gallery/`.

**SSR / script-setup contract:** Pug templates must not call those helpers on `_ctx`. Bind them in `<script setup>` (e.g. `gridTiles` computed that maps posts → `{ aspect, engagement, platform }`) so Nuxt SSR does not warn about missing instance properties.

## Technical documentation

Markdown under repo `docs/` is ingested **in place** by the `docs` collection (`REPO_DOCS_DIR` in `core/web/shared/docs-source.ts`). Do **not** copy or move those files into `core/web/content/`. Editing a file under `docs/` updates both GitHub/Pages sources and the next Nuxt Content build for in-app `/docs`.

Whenever those pages change, follow the [documentation sync checklist](../../contributing.md#whenever-documentation-is-altered) (catalogs, related hubs, and matching inline comments).

At **build** time Nuxt Content parses the tree into the Content SQLite dump. Lambda (`SYS_ENV=test` / `production`) and Docker local/dev images restore that dump from host `.output/<sysEnv>` — the original `.md` files are not required on the runtime image. `Dockerfile.app` copies that output tree; it does not `COPY docs` or rebuild Nuxt.

Excludes: Jekyll `index.md` / `_*.md`, design-history `superpowers/` and `plans/`. The in-app catalog groups by path prefix (App, Agents, Packages, Developer tooling, Ops & delivery).

UML-style diagrams:

- Markdown fenced `mermaid` (and other) code blocks render as code in the spec body.
- Structured diagrams on Gallery / Product continue to use `AppArchitectureDiagram` (SVG, no Mermaid runtime).

See [architecture.md](../reference/architecture.md) for the diagram hub (C4, API UML, wireframes, sequences).

Fetch path: `fetchContentCollection('docs', { mode: 'all' | 'first', path })` — same Nitro API as other collections. Do not call client `queryCollection()`.
