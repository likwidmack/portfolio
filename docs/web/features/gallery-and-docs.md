# In-app gallery and technical docs

The Nuxt app exposes two browse hubs that share the same pattern: a **root page**, a **grid or feed**, and **filter / group** controls.

| Route                     | Role                                                                |
| ------------------------- | ------------------------------------------------------------------- |
| [`/gallery`](/gallery)    | Social-style sample feed (reels, stills, code, diagrams)            |
| [`/docs`](/docs)          | Technical documentation sourced from the repo `docs/` markdown tree |
| [`/docs/...`](/docs/cicd) | Individual spec / runbook rendered from that markdown               |

## Gallery

Content lives in `core/web/content/gallery.json` (Nuxt Content `gallery` collection). Posts are flattened from categories into a feed:

- **Feed** — vertical, snap-adjacent cards (Instagram / TikTok-like). In-view video loops muted.
- **Grid** — thumbnail tiles; opening a tile switches back to the feed at that post.
- **Group** — series (`Reels`, `Scripts`, `Code Snippets`, `3D / XR`, `Other Samples`).
- **Filter** — `Images`, `Video`, `Code`, `Diagrams`.

Helpers: `core/web/shared/gallery-types.ts`. Exhibit rendering: `app/components/gallery/`.

## Technical documentation

Markdown under repo `docs/` is ingested **in place** by the `docs` collection (`REPO_DOCS_DIR` in `core/web/shared/docs-source.ts`). Do **not** copy or move those files into `core/web/content/`.

At **build** time Nuxt Content parses the tree into the Content SQLite dump. Lambda (`SYS_ENV=test` / `production`) and Docker local/dev images restore that dump from host `.output/<sysEnv>` — the original `.md` files are not required on the runtime image. `Dockerfile.app` copies that output tree; it does not `COPY docs` or rebuild Nuxt.

Excludes: Jekyll `index.md` / `_*.md`, design-history `superpowers/` and `plans/`. The in-app catalog groups by path prefix (App, Agents, Packages, Developer tooling, Ops & delivery).

UML-style diagrams:

- Markdown fenced `mermaid` (and other) code blocks render as code in the spec body.
- Structured diagrams on Gallery / Product continue to use `AppArchitectureDiagram` (SVG, no Mermaid runtime).

See architecture.md for an example spec with mermaid source.

Fetch path: `fetchContentCollection('docs', { mode: 'all' | 'first', path })` — same Nitro API as other collections. Do not call client `queryCollection()`.
