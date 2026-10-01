# In-app gallery and technical docs

The Nuxt app exposes two browse hubs that share the same pattern: a **root page**, a **grid or feed**, and **filter / group** controls.

| Route                     | Role                                                                | Chrome                                                              |
| ------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------- |
| [`/gallery`](/gallery)    | Social-style sample feed (reels, stills, code, diagrams)            | **Primary nav** label Gallery                                       |
| [`/docs`](/docs)          | Technical documentation sourced from the repo `docs/` markdown tree | **Work sub-nav** (`AppWorkSubNav`) — not in `AppPrimaryNav`         |
| [`/docs/...`](/docs/contributing) | Individual spec / runbook rendered from that markdown               | Linked from the docs catalog; Work sub-nav stays on Work pages only |

Public primary rail is **Work / About / Gallery / Writing / Code**. Docs, AI Lab (`/ai-lab`), and Process (`/process`) live under Work.

## Browse toolbar (`AppBrowseToolbar`)

Both hubs share one toolbar:

- **One control per facet** — a segmented group (View · Group · Filter) on wide screens; at the tablet breakpoint and below, Group and Filter become labelled native `<select>`s (44px, the OS picker on touch, "Label · count" options) laid out in an even grid. CSS shows exactly one control per facet at each width, so screen readers never meet a duplicate, and the toolbar's `minmax(0, 1fr)` track keeps it from pushing the page sideways. `/code` uses the same toolbar, and its snippet tabs become a labelled picker with ‹ › buttons on narrow screens. The old mobile `<select>` swap is gone, so each facet has exactly one control at every width.
- **`inline`** (Gallery) — on wide screens (> 768px) View | Group | Filter sit on one row with hairline dividers. The prop owns this look; pages don't restyle the toolbar. `/code` switches between its snippet tabs and the picker with a container query on the page (tabs only when the page is ≥ 48rem wide), so a 768px tablet keeps the picker.
- **Counts** — each Group / Filter option shows how many items it would show given the other facet (`count`); options at `0` are disabled unless selected.
- **Status line** — “Showing N of M posts/documents” in an `aria-live="polite"` region, plus **Clear filters** when a filter or the search text is set (changing only the view does not count).
- **Search** — Docs shows a labelled Search field (was “Query”).
- **URL state** — pages bind the toolbar through `useBrowseQuery()` (`app/composables/useBrowseQuery.ts`), which reads/writes `view`, `group`, `kind` and `q` with `router.replace` (shareable, Back-safe, no extra history). Other query keys such as Gallery's `specimen` are preserved. `app/app.vue` keys `NuxtPage` with `pageKeyFor()` (full path minus these four keys), so toolbar changes update the page in place instead of remounting it — focus stays in Search and the feed opens at the tapped post. Pure helpers: `core/web/shared/browse-query.ts` (`readBrowseQuery`, `writeBrowseQuery`, `isFiltered`).

Both hubs use the **fluid** page fit (`data-fit="fluid"`): they fill the viewport width inside the page padding. `/code` uses the same toolbar (Package facet) plus `item` for the selected snippet.

## Gallery

Content lives in `core/web/content/gallery.json` (Nuxt Content `gallery` collection). Posts are flattened from categories into a feed:

- **Default view: grid** — thumbnail tiles with platform tags (YouTube / Shorts / Reels / Still), a kind badge, category label, and engagement stats tinted with `--portfolio-teal` (`.gallery-grid__stats`).
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
